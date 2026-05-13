import { getAzureStorageHostname } from "../../lib/hosting/azure-blob-remote-hostname";
import { Result } from "../../lib/result";
import { extractHostname } from "../../lib/utils/url-utils";
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

/** Normalized `STORAGE_PROVIDER` env: known explicit values, or `null` for unset / unknown. */
export type StorageProviderEnvChoice = "none" | "s3" | "azure" | null;

export interface StorageProfileSlice {
  readonly explicitProvider: StorageProviderEnvChoice;
  readonly azureCredentialsPresent: boolean;
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
const RESOLVED_STORAGE_EXPLICIT_KEY = "ENDATIX_RESOLVED_STORAGE_EXPLICIT";
const RESOLVED_AZURE_CREDS_KEY = "ENDATIX_RESOLVED_AZURE_CREDENTIALS";
const RESOLVED_IMAGE_HOSTS_KEY = "ENDATIX_RESOLVED_IMAGE_REMOTE_HOSTNAMES";

let cachedStorageFromEnv: StorageProfileSlice | undefined;

function parseRawStorageProvider(): string | undefined {
  return process.env.STORAGE_PROVIDER?.trim().toLowerCase();
}

function isAzureCredentialsPresent(): boolean {
  const name = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const key = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  return !!name && !!key;
}

function normalizeExplicitChoice(
  raw: string | undefined,
): StorageProviderEnvChoice {
  if (raw === undefined || raw.length === 0) {
    return null;
  }
  if (raw === "none" || raw === "s3" || raw === "azure") {
    return raw;
  }
  return null;
}

function collectImageRemoteHostnames(
  explicitProvider: StorageProviderEnvChoice,
): readonly string[] {
  const hostnames: string[] = [];
  if (explicitProvider !== "none" && explicitProvider !== "s3") {
    const azureHost = getAzureStorageHostname();
    if (azureHost) {
      hostnames.push(azureHost);
    }
  }

  const s3PublicBase = process.env.S3_PUBLIC_BASE_URL?.trim();
  if (s3PublicBase) {
    const hostnameResult = extractHostname(s3PublicBase);
    if (Result.isSuccess(hostnameResult) && hostnameResult.value.length > 0) {
      hostnames.push(hostnameResult.value);
    }
  }

  return Object.freeze(hostnames.slice());
}

function buildStorageSliceFromEnv(): StorageProfileSlice {
  if (cachedStorageFromEnv !== undefined) {
    return cachedStorageFromEnv;
  }

  const rawExplicit = parseRawStorageProvider();
  const explicitProvider = normalizeExplicitChoice(rawExplicit);
  const azureCredentialsPresent = isAzureCredentialsPresent();

  cachedStorageFromEnv = Object.freeze({
    explicitProvider,
    azureCredentialsPresent,
    imageRemoteHostnames: collectImageRemoteHostnames(explicitProvider),
  });
  return cachedStorageFromEnv;
}

function encodeExplicitForMirror(
  explicit: StorageProviderEnvChoice,
): "auto" | "none" | "s3" | "azure" {
  if (explicit === null) {
    return "auto";
  }
  return explicit;
}

function decodeExplicitFromMirror(
  value: string | undefined,
): StorageProviderEnvChoice {
  const v = value?.trim() ?? "auto";
  if (v === "auto" || v.length === 0) {
    return null;
  }
  if (v === "none" || v === "s3" || v === "azure") {
    return v;
  }
  return null;
}

function readStorageProfileFromBuildMirror(): StorageProfileSlice | null {
  if (process.env[RESOLVED_STORAGE_VERSION_KEY] !== "1") {
    return null;
  }

  const explicitProvider = decodeExplicitFromMirror(
    process.env[RESOLVED_STORAGE_EXPLICIT_KEY],
  );
  const azureCredentialsPresent = process.env[RESOLVED_AZURE_CREDS_KEY] === "1";

  const rawHosts = process.env[RESOLVED_IMAGE_HOSTS_KEY]?.trim() ?? "";
  const imageRemoteHostnames: readonly string[] =
    rawHosts.length > 0
      ? Object.freeze(
          rawHosts
            .split(",")
            .map((h) => h.trim())
            .filter(Boolean),
        )
      : collectImageRemoteHostnames(explicitProvider);

  return Object.freeze({
    explicitProvider,
    azureCredentialsPresent,
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
 * Runtime storage profile only: prefers `ENDATIX_RESOLVED_*` when present, else env-derived.
 * Use from bootstrap (`register-providers`) and from {@link getStorageRuntimeSettings}; do not call
 * {@link getStorageRuntimeSettings} from `register-providers` (registration recursion).
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
  const envPrefix =
    process.env.ENDATIX_API_PREFIX !== undefined
      ? process.env.ENDATIX_API_PREFIX
      : DEFAULT_API_PREFIX;

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
    AUTH_KEYCLOAK_CLIENT_SECRET:
      mergedAuth.providers.keycloak.clientSecret ?? "",
    AUTH_KEYCLOAK_ISSUER: mergedAuth.providers.keycloak.issuer ?? "",
    SESSION_SECRET: mergedAuth.session.secret,
    SESSION_MAX_AGE_IN_MINUTES: mergedAuth.session.maxAge.toString(),
    ENDATIX_ENABLE_EXTENSIONS: mergedExperimental.extensions.toString(),
  };

  if (mergedApi !== null) {
    env.ENDATIX_API_URL = mergedApi.apiUrl;
  }

  if (source === "withEndatix") {
    env[RESOLVED_STORAGE_VERSION_KEY] = "1";
    env[RESOLVED_STORAGE_EXPLICIT_KEY] = encodeExplicitForMirror(
      storage.explicitProvider,
    );
    env[RESOLVED_AZURE_CREDS_KEY] = storage.azureCredentialsPresent ? "1" : "0";
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
