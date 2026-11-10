import { Session } from "next-auth";
import {
  AuthorizationErrorType,
  AuthorizationResult,
  GetAuthDataResult,
} from "../domain/authorization-result";
import { cache } from "react";
import { TelemetryLogger } from "@/features/telemetry";
import {
  ApiErrorType,
  ApiResult,
  EndatixApi,
  isAuthError,
  type ApiError,
} from "@/lib/endatix-api";
import { mapApiErrorToTelemetryAttributes } from "@/lib/result/map-api-error-to-telemetry-attributes";

const DEFAULT_PERMISSION_ERROR_MESSAGE =
  "An unexpected error occurred while checking permissions";
const LOGGER_NAME = "authorization";
const ExpectedAuthorizationApiErrorTypes = new Set<ApiErrorType>([
  ApiErrorType.AuthError,
  ApiErrorType.ForbiddenError,
]);

/**
 * Reads the user's authorization data from the API once per server request.
 * Nothing is kept across requests, so a role change shows on the next page load;
 * the API caches `/auth/me` per access version, which a role change moves.
 */
const fetchAuthorizationData = cache(async function fetchAuthorizationData(
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
});

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

      const authorizationDataResult = await fetchAuthorizationData(accessToken);

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
