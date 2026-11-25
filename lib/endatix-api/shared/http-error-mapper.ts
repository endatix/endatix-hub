import { ApiErrorDetails, ApiResult } from "./api-result";
import { getErrorMessageWithFallback } from "./error-codes";
import { parseErrorResponse, type ProblemDetails } from "./problem-details";

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

  return ApiResult.httpStatusError(
    response.status,
    problemMessage(problemDetails),
    problemDetails?.errorCode,
    enrichDetails(details, response, problemDetails),
    problemDetails?.fields,
  );
}

function problemMessage(problem: ProblemDetails | null) {
  const message = (problem?.detail ?? problem?.title)?.trim();
  return (
    message ||
    (problem?.errorCode && getErrorMessageWithFallback(problem.errorCode))
  );
}

function standingRefusal(
  status: number,
  problemDetails: ProblemDetails | null,
): ApiErrorDetails["requiredAction"] {
  if (
    status === 403 &&
    problemDetails?.status === 403 &&
    problemDetails.errorCode === "required_action" &&
    problemDetails.requiredActions?.some((a) => a.severity === "blocking")
  ) {
    return {
      kind: "required_action",
      actions: problemDetails.requiredActions,
    };
  }
}

/** The request's details, completed from the response and its problem details. */
function enrichDetails(
  details: ApiErrorDetails,
  response: Response,
  problemDetails: ProblemDetails | null,
): ApiErrorDetails {
  const problemMediaType = mediaTypeOf(response);
  return {
    ...details,
    requiredAction: standingRefusal(response.status, problemDetails),
    retryAfter: retryDelay(response) ?? details.retryAfter,
    statusCode: details.statusCode ?? response.status,
    details: problemDetails?.detail ?? details.details,
    traceId: problemDetails?.traceId ?? details.traceId,
    problemTitle: problemDetails?.title ?? details.problemTitle,
    problemMediaType: problemMediaType || details.problemMediaType,
    existingId: problemDetails?.existingId ?? details.existingId,
    previousSchemaRetained:
      problemDetails?.previousSchemaRetained ?? details.previousSchemaRetained,
  };
}

function retryDelay(response: Response) {
  if (response.status === 429 || response.status === 503)
    return parseRetryAfter(response.headers.get("Retry-After"));
}

function mediaTypeOf(response: Response): string | undefined {
  return response.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();
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
