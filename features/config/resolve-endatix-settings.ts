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
  resetApiConfigCacheForTests,
  type ApiConfig,
} from "./api-config";
import {
  getExperimentalConfig,
  type ExperimentalConfig,
} from "./experimental-config";
import {
  readPublicEndatixEnv,
  toClientEndatixConfig,
  type ClientEndatixConfig,
} from "./client-endatix-config";

const DEFAULT_API_PREFIX = "/api";

export type { StorageProvider } from "../../lib/hosting/storage-image-remote-hostnames";
export type { ClientEndatixConfig } from "./client-endatix-config";

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
  /** Browser-safe projection. Never includes licence keys, auth secrets, or storage credentials. */
  readonly client: ClientEndatixConfig;
  /**
   * Keys merged into `nextConfig.env` (build). Next inlines each one as a literal, so
   * nothing that must change per deployment belongs here: no storage settings, public
   * client keys, licence keys, or secrets.
   */
  readonly envPatch: Readonly<Record<string, string>>;
}

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

/**
 * Storage profile from the live `process.env` (not the active registry provider).
 * Used by {@link registerStorageProviders}, startup validation, and admin env diagnostics.
 * Never mirrored into `nextConfig.env`: Next would inline it, freezing the published image
 * to the build machine's storage env. For active provider state use
 * {@link getStorageRuntimeSettings} from `storage-runtime`.
 */
export function getRuntimeStorageProfile(): StorageProfileSlice {
  return buildStorageSliceFromEnv();
}

function buildClientConfig(
  mergedApiConfig: ApiConfig | null,
  mergedExperimentalConfig: ExperimentalConfig,
): ClientEndatixConfig {
  return toClientEndatixConfig({
    apiBaseUrl: mergedApiConfig?.apiUrl ?? "",
    extensionsEnabled: mergedExperimentalConfig.extensions,
    // Deprecated NEXT_PUBLIC_-prefixed names were folded into ENDATIX_* at server startup
    // by applyLegacyPublicEnv(), so there is exactly one source to read here.
    ...readPublicEndatixEnv(),
  });
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

function buildEnvPatch(mergedAuth: EndatixAuthConfig): Record<string, string> {
  return {
    AUTH_KEYCLOAK_ENABLED: mergedAuth.providers.keycloak.enabled.toString(),
    AUTH_KEYCLOAK_CLIENT_ID: mergedAuth.providers.keycloak.clientId ?? "",
    AUTH_KEYCLOAK_ISSUER: mergedAuth.providers.keycloak.issuer ?? "",
    SESSION_MAX_AGE_IN_MINUTES: mergedAuth.session.maxAge.toString(),
  };
}

/**
 * Single materialization pipeline: env defaults, overridden by `options` where provided.
 * Storage always comes from the current `process.env`: at build (`withEndatix`) it feeds
 * `images.remotePatterns` only, at runtime the operator's env (see {@link getRuntimeStorageProfile}).
 */
export function resolveEndatixSettings(input: {
  options?: WithEndatixOptions;
  source: ResolveEndatixSettingsSource;
}): EndatixResolvedSettings {
  const options = input.options;
  const mergedAuthConfig = mergeAuthConfig(options);
  const mergedExperimentalConfig = mergeExperimentalConfig(options);
  const mergedApiConfig = resolveMergedApiConfig(options);
  const storage = buildStorageSliceFromEnv();

  const envPatch = Object.freeze(buildEnvPatch(mergedAuthConfig));
  const client = buildClientConfig(mergedApiConfig, mergedExperimentalConfig);

  return Object.freeze({
    storage,
    mergedAuthConfig,
    mergedExperimentalConfig,
    mergedApiConfig,
    client,
    envPatch,
  });
}

/** Clears env-only storage and API caches (Vitest when flipping env). */
export function resetResolveEndatixSettingsCacheForTests(): void {
  cachedStorageFromEnv = undefined;
  resetApiConfigCacheForTests();
}
