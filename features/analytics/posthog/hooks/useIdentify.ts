'use client';

import { useCallback } from 'react';
import { usePostHog } from 'posthog-js/react';

/**
 * Hook to identify a user with PostHog
 * @returns Function to identify users
 */
export const useIdentify = () => {
  const posthog = usePostHog();

  return useCallback(
    (distinctId: string, properties?: Record<string, string | number | boolean | null>) => {
      if (!posthog || typeof window === 'undefined') return;
      
      try {
        posthog.identify(distinctId, properties);
      } catch (error) {
        console.error(`[PostHog] Failed to identify user ${distinctId}:`, error);
      }
    },
    [posthog]
  );
}; 