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

  const problemMessage = preferReadableProblemDetail(
    response.status,
    problemDetails?.detail ?? problemDetails?.title,
  );
  // Prefer the server's problem detail over a canned error-code message.
  const message = problemDetails
    ? (problemMessage ?? getErrorMessageWithFallback(serverErrorCode))
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

/**
 * Ardalis/Endatix Conflict results often format detail as:
 * "Next error(s) occurred:* A submission already exists..."
 * Prefer the concrete message after `*` for respondent-facing UI.
 */
function preferReadableProblemDetail(
  status: number,
  detail?: string,
): string | undefined {
  if (!detail) {
    return undefined;
  }

  if (status === 409) {
    const detailMessage = extractConflictDetailMessage(detail);
    if (detailMessage) {
      return detailMessage;
    }
  }

  return detail.trim();
}

/**
 * Extract the message after the first `*` up to the next `*` or line break.
 * Uses a linear string scan (no regex) to avoid ReDoS and Sonar String.match.
 */
function extractConflictDetailMessage(detail: string): string | undefined {
  const starIndex = detail.indexOf("*");
  if (starIndex < 0) {
    return undefined;
  }

  const afterStar = detail.slice(starIndex + 1);
  let end = afterStar.length;
  for (let i = 0; i < afterStar.length; i += 1) {
    const ch = afterStar[i];
    if (ch === "*" || ch === "\r" || ch === "\n") {
      end = i;
      break;
    }
  }

  const message = afterStar.slice(0, end).trim();
  return message.length > 0 ? message : undefined;
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
