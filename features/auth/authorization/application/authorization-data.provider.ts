import { Session } from "next-auth";
import {
  AuthorizationErrorType,
  AuthorizationResult,
  GetAuthDataResult,
} from "../domain/authorization-result";
import { revalidateTag, unstable_cache } from "next/cache";
import { TelemetryLogger } from "@/features/telemetry";
import {
  ApiErrorType,
  ApiResult,
  EndatixApi,
  isAuthError,
  type ApiError,
} from "@/lib/endatix-api";
import { mapApiErrorToTelemetryAttributes } from "@/lib/result/map-api-error-to-telemetry-attributes";

const USER_PERMISSIONS_CACHE_TAG = "usr_prms";
const ALL_USER_PERMISSIONS_CACHE_TAG = "usr_prms_all";
// Backstop for role changes made outside this Hub's actions (the API, another Hub
// instance): entries live in fixed 60-second windows. The window is part of the cache
// key, so an old window is never served; `revalidate` alone is stale-while-revalidate.
const USER_PERMISSIONS_CACHE_TTL = 60;
const currentCacheWindow = () =>
  Math.floor(Date.now() / (USER_PERMISSIONS_CACHE_TTL * 1000));
// Expire at once: a stale-while-revalidate profile would serve old permissions to the
// next page load. revalidateTag, not updateTag, because sign-in and route handlers
// call this too, and updateTag works only in server actions.
const EXPIRE_NOW = { expire: 0 };
const DEFAULT_PERMISSION_ERROR_MESSAGE =
  "An unexpected error occurred while checking permissions";
const LOGGER_NAME = "authorization";
const ExpectedAuthorizationApiErrorTypes = new Set<ApiErrorType>([
  ApiErrorType.AuthError,
  ApiErrorType.ForbiddenError,
]);

const getUserPermissionsCacheKey = (userId: string) =>
  `${USER_PERMISSIONS_CACHE_TAG}:${userId}`;

/**
 * Thrown inside unstable_cache when authorization fetch fails so Next.js does not
 * persist transient API/network errors in the data cache.
 */
class AuthorizationCacheBypassError extends Error {
  readonly result: GetAuthDataResult;

  constructor(result: GetAuthDataResult) {
    super("Authorization data must not be cached");
    this.name = "AuthorizationCacheBypassError";
    this.result = result;
  }
}

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

    if (shouldLogAuthorizationApiError(authorizationData)) {
      TelemetryLogger.error(
        "Failed to retrieve authorization data",
        undefined,
        mapApiErrorToTelemetryAttributes(authorizationData),
        LOGGER_NAME,
      );
    }

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
    TelemetryLogger.error(
      "Authorization data fetch failed",
      error,
      {},
      LOGGER_NAME,
    );
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
        TelemetryLogger.warn(
          "Authorization data rejected invalid token",
          {
            provider: session.provider,
          },
          LOGGER_NAME,
        );
      }

      return authorizationDataResult;
    } catch (error) {
      TelemetryLogger.error(
        "Authorization data resolution failed",
        error,
        {},
        LOGGER_NAME,
      );
      return AuthorizationResult.error();
    }
  };
}

function shouldLogAuthorizationApiError(apiError: ApiError): boolean {
  return !ExpectedAuthorizationApiErrorTypes.has(apiError.error.type);
}

/**
 * Gets authorization data for the current user from the API and caches it.
 * @param userId - The user ID
 * @param accessToken - The access token
 * @returns The authorization data
 */
const getCachedAuthorizationData = async (
  userId: string,
  accessToken: string,
): Promise<GetAuthDataResult> => {
  const cacheKey = getUserPermissionsCacheKey(userId);

  try {
    return await unstable_cache(
      async () => {
        const result = await fetchAuthorizationData(userId, accessToken);

        if (!result.success) {
          throw new AuthorizationCacheBypassError(result);
        }

        return result;
      },
      [userId, accessToken, String(currentCacheWindow())],
      {
        tags: [cacheKey, ALL_USER_PERMISSIONS_CACHE_TAG],
        revalidate: USER_PERMISSIONS_CACHE_TTL,
      },
    )();
  } catch (error) {
    if (error instanceof AuthorizationCacheBypassError) {
      return error.result;
    }

    throw error;
  }
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
  // Best effort: callers have already completed the change, so a cache error must not
  // turn it into a reported failure. The 60-second window bounds what is left.
  try {
    for (const tag of tagsToInvalidate(options)) {
      revalidateTag(tag, EXPIRE_NOW);
    }
  } catch (error) {
    TelemetryLogger.warn(
      "Failed to clear cached permissions",
      { error: String(error) },
      LOGGER_NAME,
    );
  }
}

function tagsToInvalidate(options: {
  userId?: string;
  userIds?: string[];
  allUsers?: boolean;
}): string[] {
  const userIds = [
    ...(options.userId ? [options.userId] : []),
    ...(options.userIds ?? []),
  ];
  const tags = userIds.map((id) => getUserPermissionsCacheKey(id));
  return options.allUsers ? [...tags, ALL_USER_PERMISSIONS_CACHE_TAG] : tags;
}
