/**
 * Client-side PostHog initialization
 */
import posthog from "posthog-js";
import {
  PostHogClientOptions,
  PostHogConfig,
  PostHogEventProperties,
} from "../shared/types";

// Track initialization state
let isInitialized = false;

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
 * Initialize PostHog on the client side
 * Safe to call multiple times - will only initialize once
 */
export const initPostHog = (
  config: PostHogConfig,
  options: Partial<PostHogClientOptions> = {},
): boolean => {
  if (isInitialized || !config.enabled || typeof window === "undefined") {
    return isInitialized;
  }

  if (posthog.__loaded) {
    console.log("[PostHog] PostHog is already initialized");
    isInitialized = true;

    return true;
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

    isInitialized = true;

    // Enable debug logging if configured
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
 * Check if PostHog is initialized
 */
export const isPostHogInitialized = (): boolean => {
  return isInitialized;
};

/**
 * Ensure PostHog is initialized before performing operations
 * Returns true if initialization was successful or already done
 */
export const ensureInitialized = (
  config: PostHogConfig,
  options: Partial<PostHogClientOptions> = {},
): boolean => {
  if (isInitialized) {
    return true;
  }

  return initPostHog(config, options);
};

// Track an event
export const trackEvent = (
  eventName: string,
  properties?: PostHogEventProperties,
  config?: PostHogConfig,
  options?: Partial<PostHogClientOptions>,
): void => {
  if (typeof window === "undefined") {
    return;
  }

  // If config is provided, ensure PostHog is initialized
  if (config && !isInitialized) {
    ensureInitialized(config, options);
  }

  // Skip if PostHog isn't initialized
  if (!isInitialized) {
    console.warn(
      `[PostHog] Can't track event "${eventName}": PostHog not initialized`,
    );
    return;
  }

  try {
    posthog.capture(eventName, properties);
  } catch (error) {
    console.error(`[PostHog] Failed to track event ${eventName}:`, error);
  }
};

// Check if a feature flag is enabled
export const isFeatureEnabled = (
  key: string,
  defaultValue: boolean = false,
  config?: PostHogConfig,
  options?: Partial<PostHogClientOptions>,
): boolean => {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  // If config is provided, ensure PostHog is initialized
  if (config && !isInitialized) {
    ensureInitialized(config, options);
  }

  // Skip if PostHog isn't initialized
  if (!isInitialized) {
    console.warn(
      `[PostHog] Can't check feature "${key}": PostHog not initialized`,
    );
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
 */
export const resetTrackedIdentity = (
  config?: PostHogConfig,
): void => {
  if (typeof window === "undefined") {
    return;
  }

  // Even if not initialized, we'll try the reset for safety
  // No need to warn in this case as it's a common logout pattern
  try {
    posthog.reset();
    
    if (config?.debug) {
      console.log("[PostHog] User identity reset successfully");
    }
  } catch (error) {
    console.warn("[PostHog] Failed to reset user identity:", error);
  }
};
