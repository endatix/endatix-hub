/**
 * React hook for tracking form events with PostHog
 */
import { useCallback } from 'react';
import { useTrackEvent } from './useTrackEvent';

interface FormTrackingOptions {
  formId: string;
  formName?: string;
  trackStartEnabled?: boolean;
  trackCompletion?: boolean;
  stepCount?: number;
}

interface FormSubmitHandlerOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

/**
 * Hook for tracking form-related events
 */
export const useTrackForms = (options: FormTrackingOptions) => {
  const { formId, formName, trackStartEnabled = true, trackCompletion = false, stepCount } = options;
  const { trackCategoryEvent, trackFormView, trackFormSubmit } = useTrackEvent();

  // Track form view when component mounts
  const trackView = useCallback(() => {
    trackFormView(formId, formName);
  }, [formId, formName, trackFormView]);

  // Track form start when user interacts with it
  const trackFormStart = useCallback(() => {
    if (trackStartEnabled) {
      trackCategoryEvent('form', 'start', {
        form_id: formId,
        form_name: formName || null,
      });
    }
  }, [trackStartEnabled, trackCategoryEvent, formId, formName]);

  // Track form step completion
  const trackStep = useCallback((stepNumber: number, stepName?: string) => {
    trackCategoryEvent('form', 'step', {
      form_id: formId,
      form_name: formName || null,
      step_number: stepNumber,
      step_name: stepName || null,
    });
  }, [trackCategoryEvent, formId, formName]);

  // Track form completion
  const trackComplete = useCallback(() => {
    if (trackCompletion) {
      trackCategoryEvent('form', 'complete', {
        form_id: formId,
        form_name: formName || null,
        step_count: stepCount || null,
      });
    }
  }, [trackCompletion, trackCategoryEvent, formId, formName, stepCount]);

  /**
   * Creates a submit handler that tracks form submission
   * Can be used with both synchronous and async form handlers
   */
  const createSubmitHandler = useCallback(
    <T extends unknown[]>(
      handler: (...args: T) => Promise<unknown> | unknown,
      options: FormSubmitHandlerOptions = {}
    ) => {
      return async (...args: T): Promise<unknown> => {
        try {
          const result = await handler(...args);
          trackFormSubmit(formId, true, formName);
          
          if (trackCompletion) {
            trackComplete();
          }
          
          options.onSuccess?.();
          return result;
        } catch (error) {
          trackFormSubmit(formId, false, formName, error instanceof Error ? error.message : String(error));
          options.onError?.(error);
          throw error;
        }
      };
    },
    [formId, formName, trackFormSubmit, trackComplete, trackCompletion]
  );

  /**
   * Creates a form change handler that tracks when a user starts interacting with a form
   */
  const createChangeHandler = useCallback(
    <T extends unknown[]>(handler: (...args: T) => void) => {
      let hasInteracted = false;
      
      return (...args: T): void => {
        if (!hasInteracted && trackStartEnabled) {
          trackFormStart();
          hasInteracted = true;
        }
        
        handler(...args);
      };
    },
    [trackStartEnabled, trackFormStart]
  );

  return {
    trackView,
    trackStart: trackFormStart,
    trackStep,
    trackComplete,
    trackSubmit: trackFormSubmit,
    createSubmitHandler,
    createChangeHandler,
  };
}; 