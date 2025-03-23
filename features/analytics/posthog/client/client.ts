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

// Initialize PostHog on the client side
export const initPostHog = (
  config: PostHogConfig,
  options: Partial<PostHogClientOptions> = {},
): void => {
  if (!config.enabled || typeof window === "undefined") {
    return;
  }

  try {
    const mergedOptions = { ...defaultOptions, ...options };

    // Initialize PostHog with the provided configuration
    posthog.init(config.apiKey, {
      api_host: config.apiHost,
      capture_pageview: mergedOptions.capturePageview,
      disable_session_recording: mergedOptions.disableSessionRecording,
      debug: config.debug,
      persistence: "localStorage",
      bootstrap: {
        distinctID: mergedOptions.distinctId || undefined,
      },
    });

    // Enable debug logging if configured
    if (config.debug) {
      console.log("[PostHog] Initialized with options:", {
        config,
        options: mergedOptions,
      });
    }
  } catch (error) {
    console.error("[PostHog] Failed to initialize:", error);
  }
};

// Track an event
export const trackEvent = (
  eventName: string,
  properties?: PostHogEventProperties,
): void => {
  if (typeof window === "undefined") {
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
): boolean => {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  try {
    return posthog.isFeatureEnabled(key, { send_event: true }) ?? defaultValue;
  } catch (error) {
    console.error(`[PostHog] Failed to check feature flag ${key}:`, error);
    return defaultValue;
  }
};
