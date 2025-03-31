/**
 * PostHog Analytics hooks index
 * 
 * This is the primary interface for client-side PostHog tracking.
 * Use these hooks in your React components for all tracking needs.
 */

// Import usePostHog directly from posthog-js/react
export { usePostHog } from 'posthog-js/react';

// Export specialized tracking hooks
export * from './use-track-event';
export * from './use-track-forms';
export * from './use-feature-flag';
export * from './use-identify';

// For non-React contexts, re-export initialization functions
export { initPostHog, isPostHogInitialized } from '../client'; 