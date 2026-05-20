import {
  collectStorageImageRemoteHostnamesFromEnv,
  isAzureStorageCredentialsPresentInEnv,
  isS3StorageCredentialsPresentInEnv,
  type StorageProvider,
} from "../../lib/hosting/storage-image-remote-hostnames";
import { getAuthConfig, type EndatixAuthConfig } from "./auth-config";
import {
  constructApiUrl,
  getApiConfig,
  normalizeApiPrefix,
  type ApiConfig,
} from "./api-config";
import {
  getExperimentalConfig,
  type ExperimentalConfig,
} from "./experimental-config";

const DEFAULT_API_PREFIX = "/api";

export type { StorageProvider } from "../../lib/hosting/storage-image-remote-hostnames";

export interface StorageProfileSlice {
  readonly provider: StorageProvider;
  readonly invalidProviderRaw: string | null;
  readonly azureCredentialsPresent: boolean;
  readonly s3CredentialsPresent: boolean;
  readonly imageRemoteHostnames: readonly string[];
}

export interface EndatixConfig {
  auth?: {
    providers?: {
      credentials?: {
        enabled?: boolean;
      };
      keycloak?: {
        enabled?: boolean;
        clientId?: string;
        clientSecret?: string;
        issuer?: string;
      };
    };
    session?: {
      secret?: string;
      maxAge?: number;
    };
  };
  api?: {
    baseUrl?: string;
    prefix?: string;
  };
  experimental?: {
    extensions?: boolean;
  };
}

export interface WithEndatixOptions {
  auth?: EndatixConfig["auth"];
  api?: EndatixConfig["api"];
  experimental?: EndatixConfig["experimental"];
}

export type ResolveEndatixSettingsSource = "withEndatix" | "runtime";

export interface EndatixResolvedSettings {
  readonly storage: StorageProfileSlice;
  readonly mergedAuthConfig: EndatixAuthConfig;
  readonly mergedExperimentalConfig: ExperimentalConfig;
  readonly mergedApiConfig: ApiConfig | null;
  /**
   * Keys merged into `nextConfig.env` (build). Includes `ENDATIX_RESOLVED_*` mirror so
   * {@link resolveEndatixSettings} with `source: 'runtime'` matches build-time storage + images.
   */
  readonly envPatch: Readonly<Record<string, string>>;
}

/**
 * Build mirror (`ENDATIX_RESOLVED_*`): written by {@link withEndatix} into `nextConfig.env`
 * and merged into `process.env` by Next. At runtime, {@link getRuntimeStorageProfile} prefers
 * this so storage + image host inference stays aligned with build-time `images.remotePatterns`.
 */
const RESOLVED_STORAGE_VERSION_KEY = "ENDATIX_RESOLVED_STORAGE_VERSION";
const RESOLVED_STORAGE_PROVIDER_KEY = "ENDATIX_RESOLVED_STORAGE_PROVIDER";
const RESOLVED_AZURE_CREDS_KEY = "ENDATIX_RESOLVED_AZURE_CREDENTIALS";
const RESOLVED_S3_CREDS_KEY = "ENDATIX_RESOLVED_S3_CREDENTIALS";
const RESOLVED_IMAGE_HOSTS_KEY = "ENDATIX_RESOLVED_IMAGE_REMOTE_HOSTNAMES";

const STORAGE_MIRROR_VERSION = "2";

type ParsedStorageProvider = {
  readonly provider: StorageProvider;
  readonly invalidProviderRaw: string | null;
};

let cachedStorageFromEnv: StorageProfileSlice | undefined;

function parseRawStorageProvider(): string | undefined {
  return process.env.STORAGE_PROVIDER?.trim().toLowerCase();
}

function parseStorageProvider(raw: string | undefined): ParsedStorageProvider {
  if (raw === undefined || raw.length === 0) {
    return { provider: "none", invalidProviderRaw: null };
  }
  if (raw === "none" || raw === "s3" || raw === "azure") {
    return { provider: raw, invalidProviderRaw: null };
  }
  return { provider: "none", invalidProviderRaw: raw };
}

function collectImageRemoteHostnames(
  provider: StorageProvider,
): readonly string[] {
  return collectStorageImageRemoteHostnamesFromEnv(provider);
}

function buildStorageSliceFromEnv(): StorageProfileSlice {
  if (cachedStorageFromEnv !== undefined) {
    return cachedStorageFromEnv;
  }

  const rawProvider = parseRawStorageProvider();
  const { provider, invalidProviderRaw } = parseStorageProvider(rawProvider);
  const azureCredentialsPresent = isAzureStorageCredentialsPresentInEnv();
  const s3CredentialsPresent = isS3StorageCredentialsPresentInEnv();

  cachedStorageFromEnv = Object.freeze({
    provider,
    invalidProviderRaw,
    azureCredentialsPresent,
    s3CredentialsPresent,
    imageRemoteHostnames: collectImageRemoteHostnames(provider),
  });
  return cachedStorageFromEnv;
}

function decodeProviderFromMirror(value: string | undefined): StorageProvider {
  const v = value?.trim() ?? "none";
  if (v === "none" || v === "s3" || v === "azure") {
    return v;
  }
  return "none";
}

function readStorageProfileFromBuildMirror(): StorageProfileSlice | null {
  if (process.env[RESOLVED_STORAGE_VERSION_KEY] !== STORAGE_MIRROR_VERSION) {
    return null;
  }

  const provider = decodeProviderFromMirror(
    process.env[RESOLVED_STORAGE_PROVIDER_KEY],
  );
  const azureCredentialsPresent = process.env[RESOLVED_AZURE_CREDS_KEY] === "1";
  const s3CredentialsPresent = Object.hasOwn(process.env, RESOLVED_S3_CREDS_KEY)
    ? process.env[RESOLVED_S3_CREDS_KEY] === "1"
    : isS3StorageCredentialsPresentInEnv();

  const hasResolvedImageHosts = Object.hasOwn(
    process.env,
    RESOLVED_IMAGE_HOSTS_KEY,
  );
  const rawHosts = process.env[RESOLVED_IMAGE_HOSTS_KEY]?.trim() ?? "";
  const imageRemoteHostnames: readonly string[] = hasResolvedImageHosts
    ? Object.freeze(
        rawHosts
          .split(",")
          .map((h) => h.trim())
          .filter(Boolean),
      )
    : collectImageRemoteHostnames(provider);

  return Object.freeze({
    provider,
    invalidProviderRaw: null,
    azureCredentialsPresent,
    s3CredentialsPresent,
    imageRemoteHostnames,
  });
}

function readStorageProfile(
  source: ResolveEndatixSettingsSource,
): StorageProfileSlice {
  if (source === "runtime") {
    const mirrored = readStorageProfileFromBuildMirror();
    if (mirrored !== null) {
      return mirrored;
    }
  }
  return buildStorageSliceFromEnv();
}

/**
 * Env / build-time storage profile (not the active registry provider).
 * Used by `withEndatix` mirror, {@link registerStorageProviders}, startup validation, and admin env diagnostics.
 * For active provider state use {@link getStorageRuntimeSettings} from `storage-runtime`.
 */
export function getRuntimeStorageProfile(): StorageProfileSlice {
  return readStorageProfile("runtime");
}

function mergeAuthConfig(
  options: WithEndatixOptions | undefined,
): EndatixAuthConfig {
  const baseAuthConfig = getAuthConfig();
  return {
    providers: {
      endatix: {
        ...baseAuthConfig.providers.endatix,
        ...options?.auth?.providers?.credentials,
      },
      keycloak: {
        ...baseAuthConfig.providers.keycloak,
        ...options?.auth?.providers?.keycloak,
      },
    },
    session: {
      ...baseAuthConfig.session,
      ...options?.auth?.session,
    },
  };
}

function mergeExperimentalConfig(
  options: WithEndatixOptions | undefined,
): ExperimentalConfig {
  const base = getExperimentalConfig();
  return {
    ...base,
    ...options?.experimental,
  };
}

function resolveMergedApiConfig(
  options: WithEndatixOptions | undefined,
): ApiConfig | null {
  const apiOpts = options?.api;
  if (!apiOpts?.baseUrl && !apiOpts?.prefix) {
    return getApiConfig();
  }

  const envBase = process.env.ENDATIX_BASE_URL;
  const envPrefix = (process.env.ENDATIX_API_PREFIX ??= DEFAULT_API_PREFIX);

  const baseUrl = apiOpts.baseUrl ?? envBase;
  if (!baseUrl) {
    return null;
  }

  const prefixRaw = apiOpts.prefix ?? envPrefix;
  const prefix =
    prefixRaw === undefined || prefixRaw === ""
      ? DEFAULT_API_PREFIX
      : prefixRaw;

  try {
    const apiUrl = constructApiUrl(baseUrl, normalizeApiPrefix(prefix));
    new URL(apiUrl);
    return Object.freeze({ baseUrl, prefix, apiUrl });
  } catch {
    return null;
  }
}

function buildEnvPatch(
  mergedAuth: EndatixAuthConfig,
  mergedExperimental: ExperimentalConfig,
  mergedApi: ApiConfig | null,
  storage: StorageProfileSlice,
  source: ResolveEndatixSettingsSource,
): Record<string, string> {
  const env: Record<string, string> = {
    AUTH_KEYCLOAK_ENABLED: mergedAuth.providers.keycloak.enabled.toString(),
    AUTH_KEYCLOAK_CLIENT_ID: mergedAuth.providers.keycloak.clientId ?? "",
    AUTH_KEYCLOAK_ISSUER: mergedAuth.providers.keycloak.issuer ?? "",
    SESSION_MAX_AGE_IN_MINUTES: mergedAuth.session.maxAge.toString(),
    ENDATIX_ENABLE_EXTENSIONS: mergedExperimental.extensions.toString(),
  };

  if (mergedApi !== null) {
    env.ENDATIX_API_URL = mergedApi.apiUrl;
  }

  if (source === "withEndatix") {
    env[RESOLVED_STORAGE_VERSION_KEY] = STORAGE_MIRROR_VERSION;
    env[RESOLVED_STORAGE_PROVIDER_KEY] = storage.provider;
    env[RESOLVED_AZURE_CREDS_KEY] = storage.azureCredentialsPresent ? "1" : "0";
    env[RESOLVED_S3_CREDS_KEY] = storage.s3CredentialsPresent ? "1" : "0";
    env[RESOLVED_IMAGE_HOSTS_KEY] = storage.imageRemoteHostnames.join(",");
  }

  return env;
}

/**
 * Single materialization pipeline: env defaults, overridden by `options` where provided.
 * Storage: for `source: 'withEndatix'`, always derived from current env (+ future options.storage).
 * For `source: 'runtime'`, prefers `ENDATIX_RESOLVED_*` mirror from `nextConfig.env` when present
 * (see {@link getRuntimeStorageProfile}).
 */
export function resolveEndatixSettings(input: {
  options?: WithEndatixOptions;
  source: ResolveEndatixSettingsSource;
}): EndatixResolvedSettings {
  const options = input.options;
  const mergedAuthConfig = mergeAuthConfig(options);
  const mergedExperimentalConfig = mergeExperimentalConfig(options);
  const mergedApiConfig = resolveMergedApiConfig(options);
  const storage = readStorageProfile(input.source);

  const envPatch = Object.freeze(
    buildEnvPatch(
      mergedAuthConfig,
      mergedExperimentalConfig,
      mergedApiConfig,
      storage,
      input.source,
    ),
  );

  return Object.freeze({
    storage,
    mergedAuthConfig,
    mergedExperimentalConfig,
    mergedApiConfig,
    envPatch,
  });
}

/** Clears env-only storage cache (Vitest when flipping env without mirror). */
export function resetResolveEndatixSettingsCacheForTests(): void {
  cachedStorageFromEnv = undefined;
}
