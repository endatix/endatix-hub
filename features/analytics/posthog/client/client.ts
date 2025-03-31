/**
 * Client-side PostHog initialization
 */
import posthog from "posthog-js";
import { PostHogClientOptions, PostHogConfig } from "../shared/types";

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

/**
 * Track an exception in PostHog - can be used in any context (not just React components)
 *
 * @param error - The error to track (can be an Error object, string message, or any other value)
 * @param properties - Optional additional properties to include with the event
 * @param config - Optional PostHog configuration (used to initialize if needed)
 * @param options - Optional client options for initialization
 */
export const captureException = (
  error: Error | string | unknown,
  properties: Record<string, string | number | boolean | null> = {},
  config?: PostHogConfig,
  options?: Partial<PostHogClientOptions>,
): void => {
  // Get the error message based on error type
  const errorMessage = getErrorMessage(error);
  
  const isReady = ensureReady(config, options, {
    operation: "track exception",
    identifier: errorMessage,
  });

  if (!isReady) {
    console.debug(
      "Remote capturing of exceptions is disabled. Skipping tracking of exception.",
      error,
    );
    return;
  }

  try {
    posthog.capture("exception", {
      error_message: errorMessage,
      error_stack: error instanceof Error ? error.stack || null : null,
      error_type: getErrorType(error),
      ...properties,
      timestamp: new Date().toISOString(),
    });
  } catch (trackError) {
    console.error("[PostHog] Failed to track exception:", trackError);
  }
};

/**
 * Helper function to get a string message from different error types
 */
function getErrorMessage(error: Error | string | unknown): string {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else if (error === null) {
    return 'Null error';
  } else if (error === undefined) {
    return 'Undefined error';
  } else {
    try {
      return String(error);
    } catch {
      return 'Unknown error (unconvertible to string)';
    }
  }
}

/**
 * Helper function to get the error type for analytics
 */
function getErrorType(error: Error | string | unknown): string {
  if (error instanceof Error) {
    return error.name || 'Error';
  } else if (typeof error === 'string') {
    return 'String';
  } else if (error === null) {
    return 'Null';
  } else if (error === undefined) {
    return 'Undefined';
  } else {
    return typeof error;
  }
}

export const trackException = captureException;
