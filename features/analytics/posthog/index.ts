/**
 * PostHog Analytics module
 * Main entry point for analytics functionality
 */

// Re-export shared utilities that are safe for both client and server
export * from './shared';

// Re-export client-side utilities
// These should only be used in client components
export * from './client';

// Server-side utilities are deliberately not exported here
// Import them directly from '@/hub/features/analytics/posthog/server'
// to prevent accidental inclusion in client bundles