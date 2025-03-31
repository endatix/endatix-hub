/**
 * PostHog Analytics Integration
 * 
 * This module provides tracking and analytics capabilities using PostHog.
 * It's separated into client-side (React) and server-side interfaces.
 */

// Re-export client hooks for React components
export * from './client/hooks';

// Re-export server tracking functions for server-side code
export * as server from './server';

// Re-export shared types and configuration
export * from './shared/types';
export * from './shared/config';
