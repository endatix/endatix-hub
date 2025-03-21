'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePostHog } from 'posthog-js/react';
import { PostHogEventProperties } from './posthog-types';

/**
 * Hook to track events with PostHog
 * @returns Function to track events
 */
export const usePostHogEvent = () => {
  const posthog = usePostHog();

  return useCallback(
    (eventName: string, properties?: PostHogEventProperties) => {
      if (!posthog || typeof window === 'undefined') return;
      
      try {
        posthog.capture(eventName, properties);
      } catch (error) {
        console.error(`[PostHog] Failed to track event ${eventName}:`, error);
      }
    },
    [posthog]
  );
};

/**
 * Hook to check if a feature flag is enabled
 * @param key The feature flag key
 * @param defaultValue Default value if flag is not found
 * @returns Whether the feature flag is enabled
 */
export const useFeatureFlag = (key: string, defaultValue = false): boolean => {
  const posthog = usePostHog();
  const [enabled, setEnabled] = useState<boolean>(defaultValue);

  useEffect(() => {
    if (!posthog || typeof window === 'undefined') {
      setEnabled(defaultValue);
      return;
    }

    try {
      const value = posthog.isFeatureEnabled(key, { send_event: true });
      setEnabled(value ?? defaultValue);
    } catch (error) {
      console.error(`[PostHog] Failed to check feature flag ${key}:`, error);
      setEnabled(defaultValue);
    }
  }, [posthog, key, defaultValue]);

  return enabled;
};

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