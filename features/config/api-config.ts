/**
 * API configuration module
 *
 * Handles API URL construction, validation, and normalization.
 * Provides a centralized way to manage API configuration.
 */

const DEFAULT_API_PREFIX = "/api";

let cachedConfig: ApiConfig | null = null;

export interface ApiConfig {
  baseUrl: string;
  prefix: string;
  apiUrl: string;
}

/**
 * Normalizes API prefix: ensures leading '/' for non-empty prefix, removes trailing '/', handles multiple slashes
 */
export function normalizeApiPrefix(prefix: string): string {
  let normalized = prefix.trim();

  if (normalized === "" || normalized === "/") {
    return "";
  }

  if (!normalized.startsWith("/")) {
    normalized = "/" + normalized;
  }

  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Constructs and validates the complete API URL from base URL and prefix
 */
export function constructApiUrl(baseUrl: string, prefix: string): string {
  const normalizedPrefix = normalizeApiPrefix(prefix);
  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;

  return `${normalizedBaseUrl}${normalizedPrefix}`;
}

/**
 * Parses a complete API origin (Helm `ENDATIX_API_URL`) when `ENDATIX_BASE_URL` is unset.
 */
function parseDirectApiUrl(directApiUrl: string): ApiConfig | null {
  try {
    const parsed = new URL(directApiUrl);
    const prefix =
      parsed.pathname === "/"
        ? ""
        : parsed.pathname.endsWith("/")
          ? parsed.pathname.slice(0, -1)
          : parsed.pathname;
    return Object.freeze({
      baseUrl: parsed.origin,
      prefix,
      apiUrl: `${parsed.origin}${prefix}`,
    });
  } catch {
    return null;
  }
}

/**
 * Validates and constructs the Endatix API configuration from `ENDATIX_BASE_URL`
 * (+ optional prefix) or, if base is unset, from a complete `ENDATIX_API_URL`.
 */
export function getApiConfig(): ApiConfig | null {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  const baseUrl = process.env.ENDATIX_BASE_URL;
  let apiPrefix = process.env.ENDATIX_API_PREFIX;
  if (apiPrefix === undefined) {
    apiPrefix = DEFAULT_API_PREFIX;
  }

  if (!baseUrl) {
    const directApiUrl = process.env.ENDATIX_API_URL?.trim();
    if (!directApiUrl) {
      return null;
    }
    cachedConfig = parseDirectApiUrl(directApiUrl);
    return cachedConfig;
  }

  try {
    const apiUrl = constructApiUrl(baseUrl, apiPrefix);
    new URL(apiUrl);
    cachedConfig = { baseUrl, prefix: apiPrefix, apiUrl };

    return cachedConfig;
  } catch {
    return null;
  }
}

/**
 * Resolves the API origin from env. Either `ENDATIX_BASE_URL` (+ optional
 * `ENDATIX_API_PREFIX`) or a complete `ENDATIX_API_URL` is enough.
 * When only base URL is set, writes `ENDATIX_API_URL` so server modules that
 * still read it stay in sync.
 */
export function ensureResolvedApiUrl(): ApiConfig | null {
  const config = getApiConfig();
  if (config && !process.env.ENDATIX_API_URL?.trim()) {
    process.env.ENDATIX_API_URL = config.apiUrl;
  }
  return config;
}

export const API_ORIGIN_ENV_TIP =
  "Set ENDATIX_BASE_URL (optional ENDATIX_API_PREFIX) or a complete ENDATIX_API_URL.";

/** Clears the env-derived API config cache (Vitest when flipping env). */
export function resetApiConfigCacheForTests(): void {
  cachedConfig = null;
}
