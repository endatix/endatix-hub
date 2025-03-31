/**
 * Server-side PostHog client implementation
 */
import { PostHog } from 'posthog-node';
import { createPostHogConfig, isPostHogEnabled } from '../shared/config';
import type { PostHogConfig } from '../shared/types';

// Define property types
type PostHogProperties = Record<string, string | number | boolean | null | undefined>;

let posthogInstance: PostHog | null = null;

/**
 * Get or create the PostHog server instance
 * 
 * @param config - Optional PostHog configuration
 * @returns PostHog server instance
 */
export function getPostHog(config?: PostHogConfig): PostHog | null {
  if (!posthogInstance) {
    const resolvedConfig = createPostHogConfig(config);
    
    if (!resolvedConfig || !isPostHogEnabled(resolvedConfig)) {
      return null;
    }

    // Ensure we have apiKey and apiHost before creating PostHog instance
    if (!resolvedConfig.apiKey || !resolvedConfig.apiHost) {
      return null;
    }

    posthogInstance = new PostHog(resolvedConfig.apiKey, {
      host: resolvedConfig.apiHost,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  
  return posthogInstance;
}

/**
 * Reset the PostHog server instance.
 * This is primarily used for testing purposes.
 */
export function resetPostHogServer(): void {
  posthogInstance = null;
}

/**
 * Track an event in PostHog
 *
 * @param eventName - Name of the event to track
 * @param properties - Additional properties to include with the event
 * @param config - Optional PostHog configuration
 * @returns Promise<void>
 */
export async function trackEvent(
  eventName: string,
  properties?: PostHogProperties,
  config?: PostHogConfig
): Promise<void> {
  const client = getPostHog(config);
  if (!client) return;

  try {
    await client.capture({
      event: eventName,
      properties,
      distinctId: 'server'
    });
  } catch (error) {
    console.error(`[PostHog] Failed to track event ${eventName}:`, error);
  }
}

/**
 * Track an exception in PostHog
 *
 * @param error - The error to track
 * @param properties - Additional properties to include with the exception
 * @param config - Optional PostHog configuration
 * @returns Promise<void>
 */
export async function trackException(
  error: Error | unknown,
  properties?: PostHogProperties,
  config?: PostHogConfig
): Promise<void> {
  const client = getPostHog(config);
  if (!client) return;

  try {
    const errorProperties: PostHogProperties = {
      ...properties,
    };

    // Extract error information if it's an Error object
    if (error instanceof Error) {
      errorProperties.error = error.message;
      errorProperties.stack = error.stack;
    } else if (error !== null && error !== undefined) {
      // Handle non-Error objects
      errorProperties.error = String(error);
    }

    await client.capture({
      event: '$exception',
      properties: errorProperties,
      distinctId: 'server'
    });
  } catch (captureError) {
    console.error('[PostHog] Failed to track exception:', captureError);
  }
}

/**
 * Check if a feature flag is enabled
 *
 * @param key - The feature flag key to check
 * @param defaultValue - Default value to return if checking fails
 * @param config - Optional PostHog configuration
 * @returns Promise<boolean> - Whether the feature is enabled or the default value
 */
export async function isFeatureEnabled(
  key: string,
  defaultValue: boolean = false,
  config?: PostHogConfig
): Promise<boolean> {
  const client = getPostHog(config);
  if (!client) return defaultValue;

  try {
    const result = await client.isFeatureEnabled(key, 'server');
    return result ?? defaultValue;
  } catch (error) {
    console.error(`[PostHog] Failed to check feature flag ${key}:`, error);
    return defaultValue;
  }
}