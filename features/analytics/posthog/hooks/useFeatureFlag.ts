'use client';

import { useEffect, useState } from 'react';
import { usePostHog } from 'posthog-js/react';

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