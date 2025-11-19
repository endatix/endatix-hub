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


/**
 * Converts an ApiError to an ErrorResponse to easily create a problem details response.
 * @param title - The title of the error.
 * @param apiError - The ApiError to convert.
 * @returns The ErrorResponse.
 */
function errorResponse({
  title,
  apiError,
}: {
  title: string;
  apiError: ApiError;
}): ErrorResponse {
  return {
    title: title,
    detail: getErrorMessageWithFallback(
      apiError.error.errorCode,
      apiError.error.message,
    ),
    errorCode: apiError.error.errorCode,
    fields: apiError.error.fields,
  };
}

// Converts an ApiResult to a Next.js compatible NextResponse
export function toNextResponse<T>(result: ApiResult<T>): NextResponse {
  if (ApiResult.isSuccess(result)) {
    return NextResponse.json(result.data);
  }

  switch (result.error.type) {
    case ApiErrorType.AuthError:
      return unauthorizedResponse(
        errorResponse({ title: "Unauthorized", apiError: result }),
      );
    case ApiErrorType.ForbiddenError:
      return forbiddenResponse(
        errorResponse({ title: "Forbidden", apiError: result }),
      );
    case ApiErrorType.ValidationError:
      return badRequestResponse(
        errorResponse({ title: "Bad Request", apiError: result }),
      );
    case ApiErrorType.NetworkError:
      return serverError(
        errorResponse({ title: "Network Error", apiError: result }),
      );
    default:
      return serverError(
        errorResponse({ title: "Server Error", apiError: result }),
      );
  }
}

function unauthorizedResponse(errorResponse: ErrorResponse): NextResponse {
  const problemDetails: ProblemDetails = {
    type: "https://datatracker.ietf.org/doc/html/rfc7235#section-3.1",
    title: errorResponse.title || "Unauthorized",
    detail: errorResponse.detail || "Unauthorized",
    status: 401,
  };

  if (errorResponse.errorCode) {
    problemDetails.errorCode = errorResponse.errorCode;
  }

  if (errorResponse.traceId) {
    problemDetails.traceId = errorResponse.traceId;
  }

  if (errorResponse.fields) {
    problemDetails.fields = errorResponse.fields;
  }

  return NextResponse.json(problemDetails, { status: problemDetails.status });
}

function forbiddenResponse(errorResponse: ErrorResponse): NextResponse {
  const problemDetails: ProblemDetails = {
    type: "https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.3",
    title: errorResponse.title || "Forbidden",
    detail: errorResponse.detail || "Forbidden",
    status: 403,
  };

  if (errorResponse.errorCode) {
    problemDetails.errorCode = errorResponse.errorCode;
  }

  if (errorResponse.traceId) {
    problemDetails.traceId = errorResponse.traceId;
  }

  if (errorResponse.fields) {
    problemDetails.fields = errorResponse.fields;
  }

  return NextResponse.json(problemDetails, { status: problemDetails.status });
}

function serverError(errorResponse: ErrorResponse): NextResponse {
  const problemDetails: ProblemDetails = {
    type: "https://datatracker.ietf.org/doc/html/rfc7231#section-6.6.1",
    title: errorResponse.title || "Internal Server Error",
    detail: errorResponse.detail || "Internal Server Error",
    status: 500,
  };

  if (errorResponse.errorCode) {
    problemDetails.errorCode = errorResponse.errorCode;
  }

  if (errorResponse.traceId) {
    problemDetails.traceId = errorResponse.traceId;
  }

  if (errorResponse.fields) {
    problemDetails.fields = errorResponse.fields;
  }

  return NextResponse.json(problemDetails, { status: 500 });
}

function badRequestResponse(errorResponse: ErrorResponse): NextResponse {
  const problemDetails: ProblemDetails = {
    type: "https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.1",
    title: errorResponse.title || "Bad Request",
    detail: errorResponse.detail || "Bad Request",
    status: 400,
  };

  if (errorResponse.errorCode) {
    problemDetails.errorCode = errorResponse.errorCode;
  }

  if (errorResponse.traceId) {
    problemDetails.traceId = errorResponse.traceId;
  }

  if (errorResponse.fields) {
    problemDetails.fields = errorResponse.fields;
  }

  return NextResponse.json(problemDetails, { status: problemDetails.status });
}

function notFoundResponse(errorResponse: ErrorResponse): NextResponse {
  const problemDetails: ProblemDetails = {
    type: "https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.4",
    title: errorResponse.title || "Not Found",
    detail: errorResponse.detail || "Not Found",
    status: 404,
  };

  if (errorResponse.traceId) {
    problemDetails.traceId = errorResponse.traceId;
  }

  if (errorResponse.fields) {
    problemDetails.fields = errorResponse.fields;
  }

  return NextResponse.json(problemDetails, { status: problemDetails.status });
}

/**
 * A utility object that contains the functions to create API responses.
 */
export const apiResponses = {
  unauthorized: unauthorizedResponse,
  forbidden: forbiddenResponse,
  badRequest: badRequestResponse,
  notFound: notFoundResponse,
  serverError: serverError,
};
