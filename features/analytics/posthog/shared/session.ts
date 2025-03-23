/**
 * DISABLED - Mock version of session utilities
 * This is a temporary stub to unblock client-side testing
 */

/**
 * Mock function to get user ID from session
 */
export function getUserIdFromSession(): string | null {
  // Mock implementation that does nothing
  return null;
}

/**
 * Mock function to synchronize PostHog with the user session
 */
export async function syncPostHogWithSession(): Promise<void> {
  // Mock implementation that does nothing
  console.log("Session sync disabled");
}

/**
 * Mock function to track user login
 */
export async function trackUserLogin(userId: string): Promise<void> {
  // Mock implementation that does nothing
  console.log(
    "Server-side login tracking disabled. Would track login for:",
    userId,
  );
}

/**
 * Mock function to track user logout
 */
export async function trackUserLogout(): Promise<void> {
  // Mock implementation that does nothing
  console.log("Server-side logout tracking disabled");
}
