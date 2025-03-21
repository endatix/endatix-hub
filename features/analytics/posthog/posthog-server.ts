/**
 * DISABLED - Mock version of server-side PostHog client
 * This is a temporary stub to unblock client-side testing
 */

import { PostHogConfig } from './posthog-types';

/**
 * Mock server-side PostHog client that does nothing
 */
export function createServerPostHogClient(config: PostHogConfig): any {
  return {
    capture: () => {},
    identify: () => {},
    isFeatureEnabled: async () => false,
    getAllFlags: async () => ({}),
    shutdown: async () => {},
  };
}

/**
 * Mock utility function that does nothing
 */
export async function withPostHog<T>(
  config: PostHogConfig, 
  callback: (client: any) => Promise<T>
): Promise<T | null> {
  return null;
}
