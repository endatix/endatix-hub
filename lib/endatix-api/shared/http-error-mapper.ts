import { ApiErrorDetails, ApiResult } from "./api-result";
import { getErrorMessageWithFallback } from "./error-codes";
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

  const serverErrorCode = problemDetails?.errorCode;

  const problemMessage = problemDetails?.detail ?? problemDetails?.title;
  const message = problemDetails
    ? getErrorMessageWithFallback(serverErrorCode, problemMessage)
    : undefined;

  const enrichedDetails: ApiErrorDetails = {
    ...details,
    statusCode: details.statusCode ?? response.status,
    details: problemDetails?.detail ?? details.details,
  };

  const retryAfter = response.headers.get("Retry-After");
  const retryAfterSeconds = parseRetryAfter(retryAfter);
  const detailsWithRetryAfter =
    response.status === 429 && retryAfterSeconds !== undefined
      ? {
          ...enrichedDetails,
          retryAfter: retryAfterSeconds,
        }
      : enrichedDetails;

  return ApiResult.httpStatusError(
    response.status,
    message,
    serverErrorCode,
    detailsWithRetryAfter,
    problemDetails?.fields,
  );
}

function parseRetryAfter(retryAfter: string | null): number | undefined {
  if (!retryAfter) {
    return undefined;
  }

  const delaySeconds = Number.parseInt(retryAfter, 10);
  if (Number.isFinite(delaySeconds)) {
    return Math.max(0, delaySeconds);
  }

  const retryDate = Date.parse(retryAfter);
  if (!Number.isFinite(retryDate)) {
    return undefined;
  }

  return Math.max(0, Math.floor((retryDate - Date.now()) / 1000));
}
