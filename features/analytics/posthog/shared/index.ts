/**
 * PostHog Analytics shared exports
 * 
 * This is the single source of truth for shared types, configuration,
 * and utilities that can be used in both client and server code.
 */

// Core types
export type {
  PostHogConfig,
  PostHogClientOptions,
  PostHogEventProperties,
} from './types';

// Configuration utilities
export {
  createPostHogConfig,
  getDefaultPostHogConfig,
  isPostHogEnabled,
} from './config';
