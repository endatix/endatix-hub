import { revalidateTag } from "next/cache";

/**
 * Cache invalidation utilities for user permissions
 */

/**
 * Invalidate all user permission caches
 * Use this when permissions are updated globally
 */
export async function revalidateAllUserPermissions(): Promise<void> {
  try {
    revalidateTag("user-permissions");
    console.log("Invalidated all user permission caches");
  } catch (error) {
    console.error("Error invalidating user permission caches:", error);
  }
}

/**
 * Invalidate permissions cache for a specific user
 * @param userId - The user ID to invalidate cache for
 */
export async function revalidateUserPermissions(userId: string): Promise<void> {
  try {
    revalidateTag(`user-${userId}`);
    console.log(`Invalidated permission cache for user: ${userId}`);
  } catch (error) {
    console.error(
      `Error invalidating permission cache for user ${userId}:`,
      error,
    );
  }
}

/**
 * Invalidate permissions cache for multiple users
 * @param userIds - Array of user IDs to invalidate cache for
 */
export async function revalidateMultipleUserPermissions(
  userIds: string[],
): Promise<void> {
  try {
    const promises = userIds.map((userId) => revalidateTag(`user-${userId}`));
    await Promise.all(promises);
    console.log(`Invalidated permission caches for ${userIds.length} users`);
  } catch (error) {
    console.error("Error invalidating multiple user permission caches:", error);
  }
}