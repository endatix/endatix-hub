/**
 * DISABLED - Mock version of server-side PostHog utilities
 * This is a temporary stub to unblock client-side testing
 */

import { PostHogEventProperties } from "../shared/types";

/**
 * Mock function for tracking server events (does nothing)
 */
export async function trackServerEvent(
  distinctId: string,
  event: string,
  properties?: PostHogEventProperties,
): Promise<boolean> {
  // Mock implementation that does nothing
  console.log("Server-side tracking disabled. Would track:", {
    distinctId,
    event,
    properties,
  });
  return true;
}

/**
 * Mock function for user identification (does nothing)
 */
export async function identifyServerUser(
  distinctId: string,
  properties?: Record<string, string | number | boolean | null>,
): Promise<boolean> {
  // Mock implementation that does nothing
  console.log("Server-side identification disabled. Would identify:", {
    distinctId,
    properties,
  });
  return true;
}

/**
 * Mock function for checking feature flags (always returns default)
 */
export async function isServerFeatureEnabled(
  key: string,
  distinctId: string,
  defaultValue: boolean = false,
): Promise<boolean> {
  // Mock implementation that does nothing
  console.log("Server-side feature flags disabled. Would check:", {
    key,
    distinctId,
  });
  return defaultValue;
}

/**
 * Mock function for getting feature flags (returns empty object)
 */
export async function getServerFeatureFlags(
  distinctId: string,
): Promise<Record<string, boolean | string | number>> {
  // Mock implementation that does nothing
  console.log("Server-side feature flags disabled. Would get flags for:", {
    distinctId,
  });
  return {};
}

/**
 * Mock function for getting PostHog client (returns null)
 */
export function getServerPostHogClient() {
  // Mock implementation that does nothing
  return null;
}
