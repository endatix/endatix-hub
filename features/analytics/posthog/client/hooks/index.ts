/**
 * PostHog Analytics hooks index
 */

// Import usePostHog directly from posthog-js/react
export { usePostHog } from 'posthog-js/react';

// Export specialized tracking hooks
export * from './use-track-event';
export * from './use-track-forms';
export * from './use-feature-flag';
export * from './use-identify'; 