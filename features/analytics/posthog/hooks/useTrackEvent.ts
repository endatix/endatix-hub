"use client";

/**
 * React hook for tracking events with PostHog
 */
import { useCallback } from 'react';
import { usePostHog } from 'posthog-js/react';
import { EventCategory } from '../custom-events';

type TrackEventFunction = (
  eventName: string,
  properties?: Record<string, string | number | boolean | null>
) => void;

type TrackCategoryEventFunction = (
  category: string,
  action: string,
  properties?: Record<string, string | number | boolean | null>
) => void;

interface UseTrackEvent {
  trackEvent: TrackEventFunction;
  trackCategoryEvent: TrackCategoryEventFunction;
  trackFormView: (formId: string, formName?: string) => void;
  trackFormSubmit: (formId: string, success?: boolean, formName?: string, errorDetails?: string) => void;
  trackFeatureUsage: (featureName: string, action: string, properties?: Record<string, string | number | boolean | null>) => void;
  trackInteraction: (elementType: string, elementId: string, action: string, properties?: Record<string, string | number | boolean | null>) => void;
}

/**
 * Custom hook for tracking events with PostHog
 */
export const useTrackEvent = (): UseTrackEvent => {
  const posthog = usePostHog();

  /**
   * Track a custom event with the provided name and properties
   */
  const trackEventFn = useCallback<TrackEventFunction>((eventName, properties = {}) => {
    if (posthog) {
      posthog.capture(eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
      });
    }
  }, [posthog]);

  /**
   * Track an event with a category and action
   */
  const trackCategoryEvent = useCallback<TrackCategoryEventFunction>(
    (category, action, properties = {}) => {
      if (posthog) {
        posthog.capture(`${category}_${action}`, {
          ...properties,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [posthog]
  );

  /**
   * Track form view event
   */
  const trackFormView = useCallback(
    (formId: string, formName?: string) => {
      trackCategoryEvent(EventCategory.FORM, 'view', {
        form_id: formId,
        form_name: formName || null,
      });
    },
    [trackCategoryEvent]
  );

  /**
   * Track form submit event
   */
  const trackFormSubmit = useCallback(
    (formId: string, success: boolean = true, formName?: string, errorDetails?: string) => {
      trackCategoryEvent(EventCategory.FORM, 'submit', {
        form_id: formId,
        form_name: formName || null,
        success,
        error_details: errorDetails || null,
      });
    },
    [trackCategoryEvent]
  );

  /**
   * Track feature usage event
   */
  const trackFeatureUsage = useCallback(
    (
      featureName: string,
      action: string,
      properties?: Record<string, string | number | boolean | null>
    ) => {
      trackCategoryEvent(EventCategory.FEATURE, action, {
        feature_name: featureName,
        ...properties,
      });
    },
    [trackCategoryEvent]
  );

  /**
   * Track user interaction event
   */
  const trackInteraction = useCallback(
    (
      elementType: string,
      elementId: string,
      action: string,
      properties?: Record<string, string | number | boolean | null>
    ) => {
      trackCategoryEvent(EventCategory.INTERACTION, action, {
        element_type: elementType,
        element_id: elementId,
        ...properties,
      });
    },
    [trackCategoryEvent]
  );

  return {
    trackEvent: trackEventFn,
    trackCategoryEvent,
    trackFormView,
    trackFormSubmit,
    trackFeatureUsage,
    trackInteraction,
  };
}; 