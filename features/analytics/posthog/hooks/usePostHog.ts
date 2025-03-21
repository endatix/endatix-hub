"use client";

import { useContext } from 'react';
import { PostHogContext } from '../posthog-provider';

/**
 * Hook to access the PostHog instance in client components
 */
export function usePostHog() {
  const posthog = useContext(PostHogContext);
  
  if (!posthog) {
    // Return a no-op implementation when PostHog is not available
    return {
      capture: () => {},
      identify: () => {},
      reset: () => {},
      optIn: () => {},
      optOut: () => {},
      isFeatureEnabled: () => false,
      getFeatureFlag: () => null,
      reloadFeatureFlags: () => Promise.resolve(),
      // Add other methods as needed
    };
  }
  
  return posthog;
} 