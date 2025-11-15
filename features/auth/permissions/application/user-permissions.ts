import { Session } from "next-auth";
import { AuthorizationResult } from "../domain/authorization-result";
import { revalidateTag, unstable_cache } from "next/cache";
import { ApiResult, AuthorizationData, EndatixApi } from "@/lib/endatix-api";

const USER_PERMISSIONS_CACHE_TAG = "usr_prms";
const ALL_USER_PERMISSIONS_CACHE_TAG = "usr_prms_all";
const USER_PERMISSIONS_CACHE_TTL = 720; // 12 minutes

const getUserPermissionsCacheKey = (userId: string) =>
  `${USER_PERMISSIONS_CACHE_TAG}:${userId}`;

async function getAuthorizationData(
  userId: string,
  accessToken: string,
): Promise<AuthorizationResult<AuthorizationData>> {
  try {
    const endatixApi = new EndatixApi(accessToken);
    const authorizationData = await endatixApi.auth.getAuthorizationData();

    if (ApiResult.isError(authorizationData)) {
      return AuthorizationResult.error();
    }

    return AuthorizationResult.success(authorizationData.data);
  } catch (error) {
    console.error("Error getting user permissions from session:", error);
    return AuthorizationResult.error();
  }
}

export function getUserPermissionsFactory(session: Session | null) {
  return async (): Promise<AuthorizationResult<AuthorizationData>> => {
    try {
      if (!session) {
        return AuthorizationResult.unauthenticated();
      }

      const { user, accessToken } = session;
      if (!user?.id || !accessToken || session.error) {
        return AuthorizationResult.unauthenticated();
      }

      // Use the shared cache instance with userId as parameter
      return await getCachedUserPermissions(user.id, accessToken);
    } catch (error) {
      console.error("Error getting session for permissions:", error);
      return AuthorizationResult.error();
    }
  };
}

export const getCachedUserPermissions = (
  userId: string,
  accessToken: string,
) => {
  const cacheKey = getUserPermissionsCacheKey(userId);

  return unstable_cache(
    () => getAuthorizationData(userId, accessToken),
    [userId, accessToken],
    {
      tags: [cacheKey, ALL_USER_PERMISSIONS_CACHE_TAG],
      revalidate: USER_PERMISSIONS_CACHE_TTL,
    },
  )();
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
