/**
 * User identification utilities for PostHog
 * Integrates with the auth system to provide consistent user identification
 */
import { identifyUser, getDistinctId } from './client';

// Anonymous ID prefix to distinguish from authenticated users
const ANONYMOUS_PREFIX = 'anon_';

// Property name for anonymous flag
const IS_ANONYMOUS = 'is_anonymous';

/**
 * Generate an anonymous ID for users that aren't logged in
 * @returns Anonymous distinct ID
 */
export function generateAnonymousId(): string {
  // Create a random ID with a timestamp for uniqueness
  return `${ANONYMOUS_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Get the current user's distinct ID, or generate an anonymous one if not available
 * @returns User's distinct ID
 */
export function getCurrentUserId(): string {
  if (typeof window === 'undefined') {
    return 'server_generated_id';
  }
  
  // Try to get the current user ID from PostHog
  const currentId = getDistinctId();
  
  // If we have a non-anonymous ID, use it
  if (currentId && currentId !== 'anonymous' && !currentId.startsWith(ANONYMOUS_PREFIX)) {
    return currentId;
  }
  
  // Generate a new anonymous ID
  return generateAnonymousId();
}

/**
 * Handle user login by identifying the user in PostHog
 * @param userId Authenticated user ID
 * @param properties Optional user properties
 */
export function handleUserLogin(
  userId: string, 
  properties?: Record<string, string | number | boolean | null>
): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Identify the user with PostHog
  identifyUser(userId, {
    ...properties,
    [IS_ANONYMOUS]: false,
    login_timestamp: new Date().toISOString(),
  });
}

/**
 * Handle user logout by resetting the PostHog user to anonymous
 */
export function handleUserLogout(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  // Generate a new anonymous ID
  const anonymousId = generateAnonymousId();
  
  // Identify as an anonymous user
  identifyUser(anonymousId, {
    [IS_ANONYMOUS]: true,
    logout_timestamp: new Date().toISOString(),
  });
} 