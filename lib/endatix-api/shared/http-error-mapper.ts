import { ApiErrorDetails, ApiResult } from "./api-result";
import {
  ERROR_CODE,
  getErrorMessageWithFallback,
  type ErrorCode,
} from "./error-codes";
import { parseErrorResponse } from "./problem-details";

/**
 * Maps a non-OK fetch Response to an ApiResult error using shared problem-details parsing
 * and consistent status -> ApiErrorType mapping. Used by both the Node-side EndatixApi and
 * browser-side public clients to keep error semantics in lock-step.
 */
export async function mapResponseToApiError<T>(
  response: Response,
  details: ApiErrorDetails,
): Promise<ApiResult<T>> {
  const problemDetails = await parseErrorResponse(response).catch(() => null);

  const serverErrorCode = problemDetails?.errorCode as ErrorCode | undefined;

  // Match the original Node contract: only consult the friendly canned message
  // when the SERVER provided an errorCode. Otherwise prefer raw detail/title and
  // fall through to DEFAULT_ERROR_MESSAGE so we don't replace diagnostic detail
  // with a generic, status-inferred string.
  const message = getErrorMessageWithFallback(
    serverErrorCode,
    problemDetails?.detail ?? problemDetails?.title,
  );

  // The errorCode stored on the ApiResult still reflects the server code when
  // available, otherwise the factory's status-derived default takes over.
  const errorCode =
    serverErrorCode ?? inferErrorCodeFromStatus(response.status);

  const enrichedDetails: ApiErrorDetails = {
    ...details,
    statusCode: details.statusCode ?? response.status,
    details: problemDetails?.detail ?? details.details,
  };

  switch (response.status) {
    case 400:
      return ApiResult.validationError(
        message,
        errorCode,
        enrichedDetails,
        problemDetails?.fields,
      );
    case 401:
      return ApiResult.authError(message, errorCode, enrichedDetails);
    case 403:
      return ApiResult.forbiddenError(message, errorCode, enrichedDetails);
    case 404:
      return ApiResult.notFoundError(message, enrichedDetails);
    case 429: {
      const retryAfter = response.headers.get("Retry-After");
      return ApiResult.rateLimitError(message, {
        ...enrichedDetails,
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
      });
    }
    case 500:
    case 502:
    case 503:
    case 504:
      return ApiResult.serverError(message, enrichedDetails);
    default:
      return ApiResult.unknownError(message, enrichedDetails);
  }
}

function inferErrorCodeFromStatus(status: number): ErrorCode | undefined {
  switch (status) {
    case 400:
      return ERROR_CODE.VALIDATION_ERROR;
    case 401:
      return ERROR_CODE.AUTHENTICATION_REQUIRED;
    case 403:
      return ERROR_CODE.ACCESS_FORBIDDEN;
    case 404:
      return ERROR_CODE.RESOURCE_NOT_FOUND;
    case 429:
      return ERROR_CODE.RATE_LIMIT_EXCEEDED;
    case 500:
    case 502:
    case 503:
    case 504:
      return ERROR_CODE.SERVER_ERROR;
    default:
      return undefined;
  }
}
