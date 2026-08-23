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

export const API_ORIGIN_ENV_TIP =
  "Set ENDATIX_BASE_URL (optional ENDATIX_API_PREFIX) or a complete ENDATIX_API_URL.";

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
 * Only `http:` and `https:` are accepted.
 */
function parseDirectApiUrl(directApiUrl: string): ApiConfig | null {
  try {
    const parsed = new URL(directApiUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    const prefix = normalizeApiPrefix(parsed.pathname);
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
 * Validates and constructs the Endatix API configuration.
 *
 * Precedence (first match wins):
 * 1. `ENDATIX_BASE_URL` + optional `ENDATIX_API_PREFIX` (default `/api`)
 * 2. else a complete `ENDATIX_API_URL`
 *
 * Invalid values return `null` (never a raw rejected string).
 */
export function getApiConfig(): ApiConfig | null {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  const baseUrl = process.env.ENDATIX_BASE_URL?.trim();
  if (baseUrl) {
    const prefix = normalizeApiPrefix(
      process.env.ENDATIX_API_PREFIX ?? DEFAULT_API_PREFIX,
    );
    try {
      const apiUrl = constructApiUrl(baseUrl, prefix);
      new URL(apiUrl);
      cachedConfig = Object.freeze({ baseUrl, prefix, apiUrl });
      return cachedConfig;
    } catch {
      return null;
    }
  }

  const directApiUrl = process.env.ENDATIX_API_URL?.trim();
  if (!directApiUrl) {
    return null;
  }

  cachedConfig = parseDirectApiUrl(directApiUrl);
  return cachedConfig;
}

/**
 * Same as {@link getApiConfig}, but for callers that cannot proceed without an origin.
 * Probe / diagnostics stay on {@link getApiConfig} (null = unset or invalid).
 */
export function requireApiUrl(): string {
  const apiUrl = getApiConfig()?.apiUrl;
  if (!apiUrl) {
    throw new Error(`Endatix API URL is not configured. ${API_ORIGIN_ENV_TIP}`);
  }
  return apiUrl;
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

/** Clears the env-derived API config cache (Vitest when flipping env). */
export function resetApiConfigCacheForTests(): void {
  cachedConfig = null;
}
