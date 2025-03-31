/**
 * PostHog Analytics Integration
 * 
 * This module provides tracking and analytics capabilities using PostHog.
 * It's separated into client-side (React) and server-side interfaces.
 * 
 * Usage:
 * - For React components: import from root (e.g., useTrackEvent)
 * - For server code: import from server namespace (e.g., server.trackEvent)
 * - For shared types/config: import from root (e.g., PostHogConfig)
 */

// Client-side exports (React components)
export * from './client';


// Shared types and configuration
export type { PostHogConfig, PostHogClientOptions } from './shared/types';
export { createPostHogConfig, isPostHogEnabled } from './shared/config';
