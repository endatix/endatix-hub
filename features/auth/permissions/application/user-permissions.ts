import { Session } from "next-auth";
import { PermissionResult } from "../result/permission-result";
import { UserRbacInfo, Permissions } from "..";
import { revalidateTag, unstable_cache } from "next/cache";

const USER_PERMISSIONS_CACHE_TAG = "usr_prms";
const ALL_USER_PERMISSIONS_CACHE_TAG = "usr_prms_all";
const USER_PERMISSIONS_CACHE_TTL = 720; // 12 minutes

const getUserPermissionsCacheKey = (userId: string) =>
  `${USER_PERMISSIONS_CACHE_TAG}:${userId}`;

async function getUserRbacInfo(
  userId: string,
): Promise<PermissionResult<UserRbacInfo>> {
  try {
    console.log(`📥 Fetching permissions for user:  ${userId}`);
    if (!userId) {
      return PermissionResult.unauthenticated();
    }

    /**
     * **** DON'T PANIC ****
     * This is the only permission that is used in the hub for now, so this is not compromising security at this point
     * We will replace this in next commits with permissions from the server, to control access to the hub and forms
     * Users will still be redirected to the unauthorised page if the Endatix API returns a 403 error
     */
    const user = {
      userId,
      roles: [],
      permissions: [Permissions.Apps.HubAccess],
      permissionsVersion: 1,
      lastUpdated: new Date().toISOString(),
    };

    return PermissionResult.success(user);
  } catch (error) {
    console.error("Error getting user permissions from session:", error);
    return PermissionResult.error();
  }
}

export function getUserPermissionsFactory(session: Session | null) {
  return async (): Promise<PermissionResult<UserRbacInfo>> => {
    try {
      if (!session?.user?.id || session.error) {
        return PermissionResult.unauthenticated();
      }

      // Use the shared cache instance with userId as parameter
      return await getCachedUserPermissions(session.user.id);
    } catch (error) {
      console.error("Error getting session for permissions:", error);
      return PermissionResult.error();
    }
  };
}

export const getCachedUserPermissions = (userId: string) => {
  const cacheKey = getUserPermissionsCacheKey(userId);

  return unstable_cache(() => getUserRbacInfo(userId), [userId], {
    tags: [cacheKey, ALL_USER_PERMISSIONS_CACHE_TAG],
    revalidate: USER_PERMISSIONS_CACHE_TTL,
  })();
};

/**
 * Invalidates the user permissions cache for the given user ID, user IDs, or all users
 * @param options - The options to invalidate the cache for
 * @param options.userId - The user ID to invalidate the cache for
 * @param options.userIds - The user IDs to invalidate the cache for
 * @param options.allUsers - Whether to invalidate the cache for all users
 */
export function invalidateUserPermissionsCache(options: {
  userId?: string;
  userIds?: string[];
  allUsers?: boolean;
}) {
  const { userId, userIds, allUsers } = options;

  if (userId) {
    revalidateTag(getUserPermissionsCacheKey(userId));
  }

  if (userIds) {
    for (const userId of userIds) {
      revalidateTag(getUserPermissionsCacheKey(userId));
    }
  }

  if (allUsers) {
    revalidateTag(ALL_USER_PERMISSIONS_CACHE_TAG);
  }
}
