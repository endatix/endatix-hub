/**
 * Custom event tracking utilities for PostHog
 * Provides standardized tracking for common application events
 */
import { trackEvent } from './posthog-client';
// Do not import server-utils directly as it includes server-only code
// import { trackServerEvent } from './server-utils';

// Event category constants
export const EventCategory = {
  FORM: 'form',
  NAVIGATION: 'navigation',
  INTERACTION: 'interaction',
  ERROR: 'error',
  SYSTEM: 'system',
  API: 'api',
  FEATURE: 'feature',
  AUTH: 'auth',
};

// Form event tracking
export function trackFormView(formId: string, formName?: string): void {
  trackEvent(`${EventCategory.FORM}_view`, {
    form_id: formId,
    form_name: formName || null,
    timestamp: new Date().toISOString(),
  });
}

export function trackFormStart(formId: string, formName?: string): void {
  trackEvent(`${EventCategory.FORM}_start`, {
    form_id: formId,
    form_name: formName || null,
    timestamp: new Date().toISOString(),
  });
}

export function trackFormSubmit(
  formId: string, 
  success: boolean = true, 
  formName?: string,
  errorDetails?: string
): void {
  trackEvent(`${EventCategory.FORM}_submit`, {
    form_id: formId,
    form_name: formName || null,
    success,
    error_details: errorDetails || null,
    timestamp: new Date().toISOString(),
  });
}

export function trackFormCompletion(
  formId: string,
  stepCount: number,
  formName?: string
): void {
  trackEvent(`${EventCategory.FORM}_complete`, {
    form_id: formId,
    form_name: formName || null,
    step_count: stepCount,
    timestamp: new Date().toISOString(),
  });
}

// Feature usage tracking
export function trackFeatureUsage(
  featureName: string,
  action: string,
  properties?: Record<string, string | number | boolean | null>
): void {
  trackEvent(`${EventCategory.FEATURE}_${action}`, {
    feature_name: featureName,
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

// Error tracking
export function trackError(
  errorName: string,
  errorMessage: string,
  errorStack?: string,
  componentName?: string
): void {
  trackEvent(`${EventCategory.ERROR}_occurred`, {
    error_name: errorName,
    error_message: errorMessage,
    error_stack: errorStack?.substring(0, 500) || null, // Limit stack trace length
    component_name: componentName || null,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : null,
  });
}

// API tracking
export function trackApiCall(
  endpoint: string,
  method: string,
  success: boolean,
  durationMs?: number,
  statusCode?: number,
  errorMessage?: string
): void {
  trackEvent(`${EventCategory.API}_call`, {
    endpoint,
    method,
    success,
    duration_ms: durationMs || null,
    status_code: statusCode || null,
    error_message: errorMessage || null,
    timestamp: new Date().toISOString(),
  });
}

// User interaction tracking
export function trackInteraction(
  elementType: string,
  elementId: string,
  action: string,
  properties?: Record<string, string | number | boolean | null>
): void {
  trackEvent(`${EventCategory.INTERACTION}_${action}`, {
    element_type: elementType,
    element_id: elementId,
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

// Global error boundary tracking
export function setupErrorTracking(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Listen for unhandled errors
  window.addEventListener('error', (event) => {
    trackError(
      event.error?.name || 'UnknownError',
      event.error?.message || event.message,
      event.error?.stack,
      'global'
    );
  });
  
  // Listen for unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    trackError(
      error?.name || 'UnhandledPromiseRejection',
      error?.message || String(error),
      error?.stack,
      'global'
    );
  });
}

// Server-side event tracking
// This function is moved to server.ts since it uses server-only code
// export async function trackServerAction()... 