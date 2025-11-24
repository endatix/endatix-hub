import { Session } from "next-auth";
import {
  AuthorizationErrorType,
  AuthorizationResult,
  GetAuthDataResult,
} from "../domain/authorization-result";
import { revalidateTag, unstable_cache } from "next/cache";
import { ApiResult, EndatixApi, isAuthError } from "@/lib/endatix-api";

const USER_PERMISSIONS_CACHE_TAG = "usr_prms";
const ALL_USER_PERMISSIONS_CACHE_TAG = "usr_prms_all";
const USER_PERMISSIONS_CACHE_TTL = 720; // 12 minutes
const DEFAULT_PERMISSION_ERROR_MESSAGE =
  "An unexpected error occurred while checking permissions";

const getUserPermissionsCacheKey = (userId: string) =>
  `${USER_PERMISSIONS_CACHE_TAG}:${userId}`;

async function fetchAuthorizationData(
  userId: string,
  accessToken: string,
): Promise<GetAuthDataResult> {
  try {
    const endatixApi = new EndatixApi(accessToken);
    const authorizationData = await endatixApi.auth.getAuthorizationData();

    if (ApiResult.isSuccess(authorizationData)) {
      return AuthorizationResult.success(authorizationData.data);
    }

    const errorMessage =
      ApiResult.getErrorMessage(authorizationData) ??
      DEFAULT_PERMISSION_ERROR_MESSAGE;

    if (isAuthError(authorizationData)) {
      return AuthorizationResult.error({
        message:
          "Server authentication failed. Cannot retrieve authorization data",
        type: AuthorizationErrorType.InvalidTokenError,
      });
    }

    return AuthorizationResult.error({ message: errorMessage });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : DEFAULT_PERMISSION_ERROR_MESSAGE;
    console.error("Error getting user permissions from session:", error);
    return AuthorizationResult.error({ message: errorMessage });
  }
}

/**
 * Function that gets authorization data for the current user from the API. To be used from the various checks and guards from the AuthorizationService.
 * @param session - The session object
 * @returns A function that gets authorization data for the current user
 */
export function getAuthDataForCurrentUser(session: Session | null) {
  return async (): Promise<GetAuthDataResult> => {
    try {
      const isLoggedIn = !!session;
      if (!isLoggedIn) {
        return AuthorizationResult.unauthenticated();
      }

      const { user, accessToken } = session;
      if (!user?.id || !accessToken || session.error) {
        return AuthorizationResult.unauthenticated();
      }

      // Use the shared cache instance with userId as parameter
      const authorizationDataResult = await getCachedAuthorizationData(
        user.id,
        accessToken,
      );

      if (
        !authorizationDataResult.success &&
        authorizationDataResult.error.type ===
          AuthorizationErrorType.InvalidTokenError
      ) {
        console.error(
          `🔐 Authorization Data fetching failed with Invalid token error for user ${user.id} with access token from ${session.provider} provider. Error: ${authorizationDataResult.error.message}`,
        );
      }

      return authorizationDataResult;
    } catch (error) {
      console.error("Error getting session for permissions:", error);
      return AuthorizationResult.error();
    }
  };
}

/**
 * Gets authorization data for the current user from the API and caches it.
 * @param userId - The user ID
 * @param accessToken - The access token
 * @returns The authorization data
 */
const getCachedAuthorizationData = (
  userId: string,
  accessToken: string,
): Promise<GetAuthDataResult> => {
  const cacheKey = getUserPermissionsCacheKey(userId);

  return unstable_cache(
    () => fetchAuthorizationData(userId, accessToken),
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
export function invalidateUserAuthorizationCache(options: {
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
