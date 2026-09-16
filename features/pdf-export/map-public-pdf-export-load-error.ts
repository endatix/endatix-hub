import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import type { Error as ResultError } from "@/lib/result";
import { apiResponses } from "@/lib/utils/route-handlers";
import { NextResponse } from "next/server";

const EXPIRED_TOKEN_CODES = new Set<string>([
  ERROR_CODE.TOKEN_EXPIRED,
  ERROR_CODE.INVALID_ACCESS_TOKEN,
  ERROR_CODE.INVALID_TOKEN,
  ERROR_CODE.SUBMISSION_TOKEN_INVALID,
]);

const FORBIDDEN_CODES = new Set<string>([ERROR_CODE.ACCESS_FORBIDDEN]);

const UPSTREAM_FAILURE_CODES = new Set<string>([
  ERROR_CODE.NETWORK_ERROR,
  ERROR_CODE.UNKNOWN_ERROR,
  ERROR_CODE.SERVER_ERROR,
]);

function supportFields(error: ResultError) {
  return {
    errorCode: error.errorCode,
    traceId: error.traceId,
  };
}

/**
 * Maps public PDF export load failures. Network/`fetch failed` must not become 404.
 */
export function mapPublicPdfExportLoadError(error: ResultError): NextResponse {
  if (error.errorCode && UPSTREAM_FAILURE_CODES.has(error.errorCode)) {
    return apiResponses.badGateway({
      detail: "Failed to load submission from the Endatix API.",
      ...supportFields(error),
    });
  }

  if (error.errorCode && EXPIRED_TOKEN_CODES.has(error.errorCode)) {
    return apiResponses.unauthorized({
      detail: "Access token has expired.",
      ...supportFields(error),
    });
  }

  if (error.errorCode && FORBIDDEN_CODES.has(error.errorCode)) {
    return apiResponses.forbidden({
      detail: "Access denied.",
      ...supportFields(error),
    });
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes("expired")) {
    return apiResponses.unauthorized({
      detail: "Access token has expired.",
      ...supportFields(error),
    });
  }

  if (
    errorMessage.includes("permission") ||
    errorMessage.includes("forbidden")
  ) {
    return apiResponses.forbidden({
      detail: "Access denied.",
      ...supportFields(error),
    });
  }

  if (
    errorMessage.includes("network") ||
    errorMessage.includes("fetch failed")
  ) {
    return apiResponses.badGateway({
      detail: "Failed to load submission from the Endatix API.",
      ...supportFields(error),
    });
  }

  const isNotFound =
    error.statusCode === 404 ||
    error.errorCode === ERROR_CODE.RESOURCE_NOT_FOUND ||
    error.errorCode === ERROR_CODE.FORM_NOT_FOUND;

  if (isNotFound) {
    return apiResponses.notFound({
      detail: "Submission not found.",
      ...supportFields(error),
    });
  }

  return apiResponses.badGateway({
    detail: "Failed to load submission from the Endatix API.",
    ...supportFields(error),
  });
}
