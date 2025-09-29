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
 * Validates and constructs the Endatix API configuration
 */
export function getApiConfig(): ApiConfig {
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  const baseUrl = process.env.ENDATIX_BASE_URL;
  let apiPrefix = process.env.ENDATIX_API_PREFIX;
  if (apiPrefix === undefined) {
    apiPrefix = DEFAULT_API_PREFIX;
  }

  if (!baseUrl) {
    throw new Error("ENDATIX_BASE_URL environment variable is required");
  }

  try {
    const apiUrl = constructApiUrl(baseUrl, apiPrefix);
    new URL(apiUrl);
    cachedConfig = { baseUrl, prefix: apiPrefix, apiUrl };

    return cachedConfig;
  } catch (error) {
    throw new Error(
      `Invalid API URL constructed: ${baseUrl}${apiPrefix}. ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}
