/**
 * Server-side PostHog tracking functions
 * 
 * This is the primary interface for server-side PostHog tracking.
 * Import these functions in your server-side code for all tracking needs.
 */

// Export all tracking functions
export {
  getPostHog,
  trackEvent,
  trackException,
  isFeatureEnabled,
} from './node-client';

// Export utility functions
export { createPostHogConfig } from '../shared/config'; 