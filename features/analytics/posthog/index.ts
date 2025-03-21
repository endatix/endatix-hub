/**
 * PostHog Analytics module - CLIENT SIDE EXPORTS ONLY
 * This file should only export client-side compatible modules
 */

// Client utilities - these should not import server-only modules
export * from './posthog-client';

// Providers and components
export { PostHogProvider } from './posthog-provider';
export { PostHogContext } from './posthog-provider';
export { PostHogPageView } from './posthog-pageview';

// Custom event tracking - client side only exports
export * from './custom-events';
export * from './hooks';

// User identification utilities - client side only
export {
  generateAnonymousId,
  getCurrentUserId,
  handleUserLogin,
  handleUserLogout
} from './user-identification';

// Export configuration utilities - client side only
export {
  createPostHogConfig,
  isPostHogEnabled,
  isDevelopment,
  isProduction,
  getDefaultPostHogConfig
} from './config'; 