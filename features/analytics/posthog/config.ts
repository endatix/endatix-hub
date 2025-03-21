/**
 * PostHog configuration utilities
 */
import { PostHogConfig } from "./posthog-types";

/**
 * Check if PostHog is enabled based on environment variables
 * @returns Whether PostHog is enabled
 */
export function isPostHogEnabled(config?: PostHogConfig): boolean {
  if (config) {
    return config.enabled;
  }

  return !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

/**
 * Check if the application is running in development mode
 * @returns Whether the application is running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Check if the application is running in production mode
 * @returns Whether the application is running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if application debug mode is enabled
 * Uses NEXT_PUBLIC_IS_DEBUG_MODE environment variable if set, otherwise falls back to development mode
 * @returns Whether debug mode is enabled
 */
export function isDebugMode(): boolean {
  // Check if NEXT_PUBLIC_IS_DEBUG_MODE is explicitly set
  const debugMode = process.env.NEXT_PUBLIC_IS_DEBUG_MODE;
  if (debugMode !== undefined) {
    return debugMode === "true";
  }
  
  // Fall back to development mode check
  return isDevelopment();
}

/**
 * Create a PostHog configuration object
 * @param options Options to override the default configuration
 * @returns PostHog configuration object
 */
export function createPostHogConfig(
  options?: Partial<PostHogConfig>,
): PostHogConfig {
  const defaultConfig = getDefaultPostHogConfig();
  return {
    ...defaultConfig,
    ...options,
  };
}

/**
 * Get the default PostHog configuration from environment variables
 * @returns Default PostHog configuration
 */
export function getDefaultPostHogConfig(): PostHogConfig {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";

  return {
    enabled: !!apiKey,
    apiKey,
    apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    uiHost: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || undefined,
    debug: isDebugMode(),
  };
}
