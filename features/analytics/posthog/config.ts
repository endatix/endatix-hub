/**
 * PostHog configuration utilities
 */
import { PostHogConfig } from "./posthog-types";

/**
 * Creates a PostHog configuration object with environment variables
 * @param overrideEnabled Override the enabled state from environment variables
 * @returns PostHog configuration object
 */
export const createPostHogConfig = (
  overrideEnabled?: boolean,
): PostHogConfig => {
  // Check if PostHog is enabled based on environment variable
  const envEnabled = process.env.POSTHOG_ENABLED === "true";
  const isEnabled =
    overrideEnabled !== undefined ? overrideEnabled : envEnabled;

  return {
    enabled: isEnabled,
    apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || "",
    apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    debug:
      process.env.NODE_ENV === "development" &&
      process.env.POSTHOG_DEBUG === "true",
  };
};

/**
 * Check if PostHog is enabled and properly configured
 * @param config PostHog configuration
 * @returns boolean indicating if PostHog should be used
 */
export const isPostHogEnabled = (config: PostHogConfig): boolean => {
  // PostHog is enabled if explicitly enabled and API key is provided
  return config.enabled && !!config.apiKey;
};

/**
 * Check if current environment is development
 * @returns boolean indicating if current environment is development
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === "development";
};

/**
 * Check if current environment is production
 * @returns boolean indicating if current environment is production
 */
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === "production";
};

/**
 * Get default PostHog configuration singleton
 * This is useful for server components that need PostHog configuration
 */
export const getDefaultPostHogConfig = (): PostHogConfig => {
  return createPostHogConfig();
};
