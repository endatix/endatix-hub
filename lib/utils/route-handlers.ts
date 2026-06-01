import { NextResponse } from "next/server";
import {
  ApiError,
  ApiErrorType,
  ApiResult,
  getErrorMessageWithFallback,
} from "../endatix-api/types";
import { ProblemDetails } from "../endatix-api/shared/problem-details";

interface ErrorResponse {
  title?: string;
  detail?: string;
  errorCode?: string;
  traceId?: string;
  fields?: Record<string, string[]>;
}

const HTTP_ERROR_PRESENTATION: Record<number, { title: string; type: string }> =
  {
    400: {
      title: "Bad Request",
      type: "https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.1",
    },
    401: {
      title: "Unauthorized",
      type: "https://datatracker.ietf.org/doc/html/rfc7235#section-3.1",
    },
    403: {
      title: "Forbidden",
      type: "https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.3",
    },
    404: {
      title: "Not Found",
      type: "https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.4",
    },
    429: {
      title: "Too Many Requests",
      type: "https://datatracker.ietf.org/doc/html/rfc6585#section-4",
    },
    500: {
      title: "Internal Server Error",
      type: "https://datatracker.ietf.org/doc/html/rfc7231#section-6.6.1",
    },
  };

const DEFAULT_INVALID_JSON_DETAIL = "Invalid JSON body";

export type ParsedJsonBody<T> =
  | { ok: true; value: T }
  | { ok: false; error: NextResponse };

/**
 * Parses the JSON body of a request.
 * @param request - The request object.
 * @param options - The options object.
 * @returns The parsed JSON body.
 */
export async function parseJsonBody<T>(
  request: Request,
  options?: { invalidDetail?: string },
): Promise<ParsedJsonBody<T>> {
  try {
    return { ok: true, value: (await request.json()) as T };
  } catch {
    return {
      ok: false,
      error: apiResponses.badRequest({
        detail: options?.invalidDetail ?? DEFAULT_INVALID_JSON_DETAIL,
      }),
    };
  }
}

/**
 * Parses JSON when present; returns defaultValue for an empty body.
 */
export async function parseOptionalJsonBody<T>(
  request: Request,
  defaultValue: T,
  options?: { invalidDetail?: string },
): Promise<ParsedJsonBody<T>> {
  try {
    const text = await request.text();
    if (text.length === 0) {
      return { ok: true, value: defaultValue };
    }

    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return {
      ok: false,
      error: apiResponses.badRequest({
        detail: options?.invalidDetail ?? DEFAULT_INVALID_JSON_DETAIL,
      }),
    };
  }
}

export function toApiResponse<T>(result: ApiResult<T>): NextResponse {
  if (ApiResult.isSuccess(result)) {
    return NextResponse.json(result.data);
  }

  return createProblemDetailsResponse(
    mapApiErrorToErrorResponse(result),
    getHttpStatusFromApiResult(result),
  );
}

function getHttpStatusFromApiResult<T>(result: ApiResult<T>): number {
  if (ApiResult.isSuccess(result)) {
    return 200;
  }

  return (
    result.error.details?.statusCode ??
    getHttpStatusFromApiErrorType(result.error.type)
  );
}

function getHttpStatusFromApiErrorType(errorType: ApiErrorType): number {
  switch (errorType) {
    case ApiErrorType.AuthError:
      return 401;
    case ApiErrorType.ForbiddenError:
      return 403;
    case ApiErrorType.NotFoundError:
      return 404;
    case ApiErrorType.ValidationError:
    case ApiErrorType.JsonParseError:
      return 400;
    case ApiErrorType.RateLimitError:
      return 429;
    default:
      return 500;
  }
}

function mapApiErrorToErrorResponse(apiError: ApiError): ErrorResponse {
  return {
    detail: getErrorMessageWithFallback(
      apiError.error.errorCode,
      apiError.error.message,
    ),
    errorCode: apiError.error.errorCode,
    fields: apiError.error.fields,
  };
}

function getHttpErrorPresentation(status: number): {
  title: string;
  type: string;
} {
  return (
    HTTP_ERROR_PRESENTATION[status] ?? {
      type: `https://httpstatuses.com/${status}`,
      title: `${status} Error`,
    }
  );
}

function createProblemDetailsResponse(
  error: ErrorResponse,
  status: number,
): NextResponse {
  const presentation = getHttpErrorPresentation(status);

  const problemDetails: ProblemDetails = {
    type: presentation.type,
    title: error.title || presentation.title,
    detail: error.detail || presentation.title,
    status,
  };

  if (error.errorCode) {
    problemDetails.errorCode = error.errorCode;
  }

  if (error.traceId) {
    problemDetails.traceId = error.traceId;
  }

  if (error.fields) {
    problemDetails.fields = error.fields;
  }

  return NextResponse.json(problemDetails, { status });
}

export const apiResponses = {
  unauthorized: (error: ErrorResponse) =>
    createProblemDetailsResponse(error, 401),
  forbidden: (error: ErrorResponse) => createProblemDetailsResponse(error, 403),
  badRequest: (error: ErrorResponse) =>
    createProblemDetailsResponse(error, 400),
  notFound: (error: ErrorResponse) => createProblemDetailsResponse(error, 404),
  serverError: (error: ErrorResponse) =>
    createProblemDetailsResponse(error, 500),
};

export interface CachingOptions {
  storeMode?: "browserOnly" | "noStore";
  etag?: string;
}

export function setResponseCachingHeaders(
  response: NextResponse,
  options: CachingOptions,
): void {
  const { storeMode = "browserOnly" } = options;
  if (storeMode === "browserOnly") {
    response.headers.set(
      "Cache-Control",
      "private, max-age=0, must-revalidate",
    );
  } else if (storeMode === "noStore") {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate",
    );
  }

  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Cookie");

  if (options.etag) {
    response.headers.set("ETag", `"${options.etag}"`);
  }
}
