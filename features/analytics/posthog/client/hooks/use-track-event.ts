"use client";

/**
 * React hook for tracking events with PostHog
 */
import { useCallback, useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';
import { ensureReady, isPostHogInitialized } from '../client';
import type { PostHogConfig, PostHogClientOptions } from '../../shared/types';

type TrackEventFunction = (
  eventName: string,
  properties?: Record<string, string | number | boolean | null>
) => void;

type TrackCategoryEventFunction = (
  category: string,
  action: string,
  properties?: Record<string, string | number | boolean | null>
) => void;

type TrackExceptionFunction = (
  error: Error | unknown,
  properties?: Record<string, string | number | boolean | null>
) => void;

interface UseTrackEvent {
  trackEvent: TrackEventFunction;
  trackCategoryEvent: TrackCategoryEventFunction;
  trackFormView: (formId: string, formName?: string) => void;
  trackFormSubmit: (formId: string, success?: boolean, formName?: string, errorDetails?: string) => void;
  trackFeatureUsage: (featureName: string, action: string, properties?: Record<string, string | number | boolean | null>) => void;
  trackInteraction: (elementType: string, elementId: string, action: string, properties?: Record<string, string | number | boolean | null>) => void;
  trackException: TrackExceptionFunction;
  isInitialized: boolean;
}

interface UseTrackEventOptions {
  config?: PostHogConfig;
  clientOptions?: Partial<PostHogClientOptions>;
}

/**
 * Custom hook for tracking events with PostHog
 */
export const useTrackEvent = (options?: UseTrackEventOptions): UseTrackEvent => {
  const posthog = usePostHog();
  const { config, clientOptions } = options || {};

  // Initialize PostHog if config is provided
  useEffect(() => {
    if (config) {
      ensureReady(config, clientOptions);
    }
  }, [config, clientOptions]);

  /**
   * Track a custom event with the provided name and properties
   */
  const trackEventFn = useCallback<TrackEventFunction>((eventName, properties = {}) => {
    if (!posthog && config) {
      const isReady = ensureReady(config, clientOptions, {
        operation: 'track event',
        identifier: eventName,
      });
      if (!isReady) return;
    }

    if (posthog) {
      try {
        posthog.capture(eventName, {
          ...properties,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`[PostHog] Failed to track event ${eventName}:`, error);
      }
    }
  }, [posthog, config, clientOptions]);

  /**
   * Track an event with a category and action
   */
  const trackCategoryEvent = useCallback<TrackCategoryEventFunction>(
    (category, action, properties = {}) => {
      trackEventFn(`${category}_${action}`, {
        ...properties,
      });
    },
    [trackEventFn]
  );

  /**
   * Track form view event
   */
  const trackFormView = useCallback(
    (formId: string, formName?: string) => {
      trackEventFn('form_view', {
        form_id: formId,
        form_name: formName || null,
      });
    },
    [trackEventFn]
  );

  /**
   * Track form submit event
   */
  const trackFormSubmit = useCallback(
    (formId: string, success = true, formName?: string, errorDetails?: string) => {
      trackEventFn('form_submit', {
        form_id: formId,
        form_name: formName || null,
        success,
        error_details: errorDetails || null,
      });
    },
    [trackEventFn]
  );

  /**
   * Track feature usage
   */
  const trackFeatureUsage = useCallback(
    (featureName: string, action: string, properties = {}) => {
      trackEventFn('feature_usage', {
        feature_name: featureName,
        action,
        ...properties,
      });
    },
    [trackEventFn]
  );

  /**
   * Track user interaction
   */
  const trackInteraction = useCallback(
    (elementType: string, elementId: string, action: string, properties = {}) => {
      trackEventFn('interaction', {
        element_type: elementType,
        element_id: elementId,
        action,
        ...properties,
      });
    },
    [trackEventFn]
  );

  /**
   * Track an exception with optional properties
   */
  const trackException = useCallback<TrackExceptionFunction>(
    (error, properties = {}) => {
      if (!posthog && config) {
        const isReady = ensureReady(config, clientOptions, {
          operation: 'track exception',
          identifier: error instanceof Error ? error.message : 'Unknown error',
        });
        if (!isReady) return;
      }

      if (posthog) {
        try {
          posthog.capture('exception', {
            error_message: error instanceof Error ? error.message : 'Unknown error',
            error_stack: error instanceof Error ? error.stack || null : null,
            ...properties,
            timestamp: new Date().toISOString(),
          });
        } catch (trackError) {
          console.error('[PostHog] Failed to track exception:', trackError);
        }
      }
    },
    [posthog, config, clientOptions]
  );

  return {
    trackEvent: trackEventFn,
    trackCategoryEvent,
    trackFormView,
    trackFormSubmit,
    trackFeatureUsage,
    trackInteraction,
    trackException,
    isInitialized: isPostHogInitialized(),
  };
}; 