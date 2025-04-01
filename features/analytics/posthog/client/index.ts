/**
 * PostHog Analytics client-side exports
 * 
 * This is the primary interface for client-side PostHog tracking.
 * Use these exports in your React components for all tracking needs.
 */

// Core client utilities
export {
  initPostHog,
  isPostHogInitialized,
  ensureReady,
  captureException,
} from './client';

// React components
export { PostHogProvider } from "./provider";
export { PostHogPageView } from "./pageview";
export { PostHogUserIdentity } from "./user-identity";

// React hooks
export * from './hooks';

// Re-export shared types and utilities
export type { PostHogConfig, PostHogClientOptions } from '../shared/types';
export { createPostHogConfig, isPostHogEnabled } from '../shared/config';
