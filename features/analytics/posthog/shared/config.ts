/**
 * PostHog configuration utilities
 */
import { getIsomorphicEndatixConfig } from "@/features/config/client-endatix-config";
import { PostHogConfig } from "./types";

/**
 * Check if PostHog is enabled based on environment variables.
 *
 * For isomorphic and browser callers. A **server-only** module must not use this: it
 * resolves through {@link getIsomorphicEndatixConfig}, which branches on `typeof window`
 * — defined under jsdom — so server code would read the empty browser projection in tests
 * and quietly disable PostHog. Server-only callers read `readPublicEndatixEnv()` directly
 * (see `lib/feature-flags/factories/`).
 *
 * @returns Whether PostHog is enabled
 */
export function isPostHogEnabled(config?: PostHogConfig): boolean {
  if (config) {
    return config.enabled;
  }

  return !!getIsomorphicEndatixConfig().posthogKey;
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
 * Check if application debug mode is enabled.
 * Uses ENDATIX_IS_DEBUG_MODE if set, otherwise falls back to the development build.
 * The precedence lives in `readPublicEndatixEnv()` so server and browser agree.
 * @returns Whether debug mode is enabled
 */
export function isDebugMode(): boolean {
  return getIsomorphicEndatixConfig().isDebugMode;
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
  const { posthogKey, posthogHost, posthogUiHost, isDebugMode } =
    getIsomorphicEndatixConfig();

  return {
    enabled: !!posthogKey,
    apiKey: posthogKey,
    apiHost: posthogHost,
    uiHost: posthogUiHost || undefined,
    debug: isDebugMode,
  };
}
