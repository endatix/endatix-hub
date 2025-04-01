'use client';

import { useEffect, useState } from 'react';
import { usePostHog } from 'posthog-js/react';
import { ensureReady, isPostHogInitialized } from '../client';
import type { PostHogConfig, PostHogClientOptions } from '../../shared/types';

interface UseFeatureFlagOptions {
  config?: PostHogConfig;
  clientOptions?: Partial<PostHogClientOptions>;
}

/**
 * Hook to check if a feature flag is enabled
 * @param key The feature flag key
 * @param defaultValue Default value if flag is not found
 * @param options Configuration options
 * @returns Whether the feature flag is enabled
 */
export const useFeatureFlag = (
  key: string, 
  defaultValue = false,
  options?: UseFeatureFlagOptions
): boolean => {
  const posthog = usePostHog();
  const [enabled, setEnabled] = useState<boolean>(defaultValue);
  const { config, clientOptions } = options || {};

  useEffect(() => {
    // Try to initialize PostHog if not already initialized
    if (!posthog && config) {
      ensureReady(config, clientOptions, {
        operation: 'check feature',
        identifier: key,
      });
    }

    if (!posthog && !isPostHogInitialized()) {
      setEnabled(defaultValue);
      return;
    }

    try {
      const value = posthog?.isFeatureEnabled(key, { send_event: true });
      setEnabled(value ?? defaultValue);
    } catch (error) {
      console.error(`[PostHog] Failed to check feature flag ${key}:`, error);
      setEnabled(defaultValue);
    }
  }, [posthog, key, defaultValue, config, clientOptions]);

  return enabled;
}; 