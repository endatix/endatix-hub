/**
 * Client-side PostHog initialization
 */
import posthog from "posthog-js";
import {
  PostHogClientOptions,
  PostHogConfig,
  PostHogEventProperties,
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
 * Private helper for track methods.
 *
 * @param config - Optional PostHog configuration (used to initialize if needed)
 * @param options - Additional client options for initialization
 * @param context - Optional logging context for meaningful error messages
 * @returns boolean - Whether PostHog is ready for the operation
 */
const ensureReady = (
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

/**
 * Track an event in PostHog
 *
 * @param eventName - Name of the event to track
 * @param properties - Additional properties to include with the event
 * @param config - PostHog configuration (optional, used to initialize if needed)
 * @param options - Additional client options for initialization
 * @returns void
 */
export const trackEvent = (
  eventName: string,
  properties?: PostHogEventProperties,
  config?: PostHogConfig,
  options?: Partial<PostHogClientOptions>,
): void => {
  if (
    !ensureReady(config, options, {
      operation: "track event",
      identifier: eventName,
    })
  ) {
    return;
  }

  try {
    posthog.capture(eventName, properties);
  } catch (error) {
    console.error(`[PostHog] Failed to track event ${eventName}:`, error);
  }
};

/**
 * Track an exception in PostHog
 *
 * @param error - The error object to capture
 * @param properties - Additional properties to include with the exception
 * @param config - PostHog configuration (optional, used to initialize if needed)
 * @param options - Additional client options for initialization
 * @returns void
 */
export const trackException = (
  error: Error | unknown,
  properties?: PostHogEventProperties,
  config?: PostHogConfig,
  options?: Partial<PostHogClientOptions>,
): void => {
  if (!ensureReady(config, options, { operation: "track exception" })) {
    return;
  }

  try {
    posthog.captureException(error, properties);
  } catch (captureError) {
    console.error("[PostHog] Failed to track exception:", captureError);
  }
};

/**
 * Check if a feature flag is enabled
 *
 * @param key - The feature flag key to check
 * @param defaultValue - Default value to return if checking fails
 * @param config - PostHog configuration (optional, used to initialize if needed)
 * @param options - Additional client options for initialization
 * @returns boolean - Whether the feature is enabled or the default value
 */
export const isFeatureEnabled = (
  key: string,
  defaultValue: boolean = false,
  config?: PostHogConfig,
  options?: Partial<PostHogClientOptions>,
): boolean => {
  if (
    !ensureReady(config, options, {
      operation: "check feature",
      identifier: key,
    })
  ) {
    return defaultValue;
  }

  try {
    return posthog.isFeatureEnabled(key, { send_event: true }) ?? defaultValue;
  } catch (error) {
    console.error(`[PostHog] Failed to check feature flag ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Safely reset the PostHog user identity
 * This is typically called during logout to clear the user's identity
 *
 * @param config - Optional PostHog configuration for debug logging
 * @param options - Additional client options for initialization
 * @returns void
 */
export const resetTrackedIdentity = (
  config?: PostHogConfig,
  options?: Partial<PostHogClientOptions>,
): void => {
  if (!ensureReady(config, options, { operation: "reset identity" })) {
    return;
  }

  try {
    posthog.reset();
  } catch (error) {
    console.error("[PostHog] Failed to reset user identity:", error);
  }
};
