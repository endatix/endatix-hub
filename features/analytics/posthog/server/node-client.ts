/**
 * Server-side PostHog client implementation
 */
import { PostHog } from 'posthog-node';
import { createPostHogConfig, isPostHogEnabled } from '../shared/config';
import type { PostHogConfig } from '../shared/types';

let posthogInstance: PostHog | null = null;

/**
 * Get or create the PostHog server instance
 * 
 * @param config - Optional PostHog configuration
 * @returns PostHog server instance
 */
export function getPostHogServer(config?: PostHogConfig): PostHog | null {
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