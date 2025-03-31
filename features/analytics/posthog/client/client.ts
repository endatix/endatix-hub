/**
 * Client-side PostHog initialization
 */
import posthog from "posthog-js";
import {
  PostHogClientOptions,
  PostHogConfig,
} from "../shared/types";

// Default PostHog configuration
const defaultOptions: PostHogClientOptions = {
  capturePageview: false,
  disableSessionRecording: false,
  apiOptions: {
    flushAt: 20,
    flushInterval: 10000,
  },
};

/**
 * Check if PostHog is initialized
 * This directly checks PostHog's state
 */
export const isPostHogInitialized = (): boolean => {
  return posthog && posthog.__loaded === true;
};

/**
 * Determines if PostHog should be initialized based on config and environment
 *
 * @param config - PostHog configuration
 * @returns boolean - Whether PostHog should attempt initialization
 */
const shouldInitialize = (config?: PostHogConfig): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  if (isPostHogInitialized()) {
    return false;
  }

  if (!config || !config.apiKey || !config.enabled) {
    return false;
  }

  return true;
};

/**
 * Initializes PostHog with the provided configuration
 *
 * @param config - PostHog configuration options
 * @param options - Additional client options
 * @returns boolean - Returns true ONLY if PostHog was newly initialized during this call,
 *                    false if initialization was skipped (already initialized or disabled)
 */
export const initPostHog = (
  config: PostHogConfig,
  options: Partial<PostHogClientOptions> = {},
): boolean => {
  if (!shouldInitialize(config)) {
    return false;
  }

  try {
    const mergedOptions = { ...defaultOptions, ...options };

    posthog.init(config.apiKey, {
      api_host: config.apiHost,
      ui_host: config.uiHost,
      capture_pageview: mergedOptions.capturePageview,
      disable_session_recording: mergedOptions.disableSessionRecording,
      autocapture: true,
      person_profiles: "identified_only",
      debug: config.debug,
      persistence: "localStorage",
      bootstrap: {
        distinctID: mergedOptions.distinctId || undefined,
      },
    });

    if (config.debug) {
      console.log("[PostHog] Initialized with options:", {
        config,
        options: mergedOptions,
      });
    }

    return true;
  } catch (error) {
    console.error("[PostHog] Failed to initialize:", error);
    return false;
  }
};

/**
 * Validates if PostHog is ready for operations and attempts initialization if needed
 * This is a utility function for hooks and other consumers.
 *
 * @param config - Optional PostHog configuration (used to initialize if needed)
 * @param options - Additional client options for initialization
 * @param context - Optional logging context for meaningful error messages
 * @returns boolean - Whether PostHog is ready for the operation
 */
export const ensureReady = (
  config?: PostHogConfig,
  options?: Partial<PostHogClientOptions>,
  context?: { operation?: string; identifier?: string },
): boolean => {
  // Check browser environment
  if (typeof window === "undefined") {
    return false;
  }

  // Log context preparation
  const operation = context?.operation || "perform operation";
  const identifierMsg = context?.identifier ? ` "${context.identifier}"` : "";

  // If already initialized, we're good to go
  if (isPostHogInitialized()) {
    return true;
  }

  // Without config, we can't initialize
  if (!config) {
    console.warn(
      `[PostHog] Can't ${operation}${identifierMsg}: No configuration provided`,
    );
    return false;
  }

  // Check if we should attempt initialization based on config values
  if (!shouldInitialize(config)) {
    return false;
  }

  initPostHog(config, options);
  return isPostHogInitialized();
};
