import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { ErrorType, type Error as ResultError } from "@/lib/result";
import type { ErrorPresentation } from "./error-presentation";

export type UnexpectedErrorKind =
  | "general"
  | "client"
  | "authorization"
  | "network"
  | "service";

export interface UnexpectedErrorUi extends ErrorPresentation {
  kind: UnexpectedErrorKind;
  /** Always known for these — every kind maps to a status. */
  code: string;
  subtitle: string;
}

export interface UnexpectedErrorDiagnostics {
  digest?: string;
  traceId?: string;
  errorCode?: string;
  statusCode?: number;
}

/**
 * Maps an unexpected boundary error into safe user-facing copy.
 * Production must not rely on raw server `error.message`.
 */
export function getUnexpectedErrorUi(error: Error): UnexpectedErrorUi {
  const normalizedMessage = error.message.toLowerCase();

  if (
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("forbidden")
  ) {
    return unexpectedErrorUiByKind("authorization");
  }

  if (
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("fetch failed") ||
    normalizedMessage.includes("timeout")
  ) {
    return unexpectedErrorUiByKind("network");
  }

  if (
    normalizedMessage.includes("service unavailable") ||
    normalizedMessage.includes("503")
  ) {
    return unexpectedErrorUiByKind("service");
  }

  return unexpectedErrorUiByKind("general");
}

/**
 * Maps a Hub `Result` error using HTTP status / error type (not message sniffing).
 */
export function unexpectedErrorUiFromResult(
  result: ResultError,
): UnexpectedErrorUi {
  const status = result.statusCode;

  // A transport failure never produced a response, so there is no status to read.
  // Without this it fell through to `general` and told the reader "500 - Something
  // went wrong" while the diagnostics panel underneath said `network_error`.
  if (result.errorCode === ERROR_CODE.NETWORK_ERROR) {
    return unexpectedErrorUiByKind("network");
  }

  if (status === 401 || status === 403) {
    return unexpectedErrorUiByKind("authorization");
  }

  if (status === 404) {
    return {
      kind: "client",
      code: "404",
      eyebrow: "Not found",
      title: "This resource could not be found.",
      subtitle: "It may have been removed or the link is incorrect.",
      message: "Check the URL and try again.",
    };
  }

  if (
    result.errorType === ErrorType.ValidationError ||
    status === 400 ||
    status === 409 ||
    status === 422
  ) {
    return unexpectedErrorUiByKind("client");
  }

  if (
    status === 429 ||
    status === 503 ||
    (status !== undefined && status >= 500)
  ) {
    return unexpectedErrorUiByKind("service");
  }

  return unexpectedErrorUiByKind("general");
}

export function unexpectedErrorUiByKind(
  kind: UnexpectedErrorKind,
): UnexpectedErrorUi {
  switch (kind) {
    case "authorization":
      return {
        kind,
        code: "403",
        eyebrow: "Access denied",
        title: "You do not have permission to perform this action.",
        subtitle: "Access was denied for this request.",
        message:
          "Please verify your permissions or switch to an account with the required access.",
      };
    case "client":
      return {
        kind,
        code: "400",
        eyebrow: "Request rejected",
        title: "We could not load this page.",
        subtitle: "The server rejected the request.",
        message:
          "Try again. If the issue persists, share diagnostics with support.",
      };
    case "network":
      return {
        kind,
        code: "503",
        eyebrow: "Connection problem",
        title: "A temporary network issue interrupted this request.",
        subtitle: "We could not reach the service.",
        message:
          "Check your connection and retry. If this continues, please contact support.",
      };
    case "service":
      return {
        kind,
        code: "503",
        eyebrow: "Service unavailable",
        title: "This service is temporarily unavailable.",
        subtitle: "Please try again in a moment.",
        message:
          "We are restoring normal operation. Retry shortly or contact support if it persists.",
      };
    case "general":
    default:
      return {
        kind: "general",
        code: "500",
        eyebrow: "Unexpected error",
        title: "Something went wrong.",
        subtitle: "An unexpected error interrupted this page.",
        message:
          "Try again. If the issue persists, share diagnostics with support.",
      };
  }
}

export function diagnosticsFromResult(
  result: ResultError,
): UnexpectedErrorDiagnostics {
  return {
    traceId: result.traceId,
    errorCode: result.errorCode,
    statusCode: result.statusCode,
  };
}

type ErrorWithSupportMetadata = Error & {
  digest?: string;
  traceId?: string;
  errorCode?: string;
  statusCode?: number;
};

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * Collects support identifiers from a boundary error.
 * Prefer API `traceId` (OpenTelemetry / ProblemDetails) when present; always keep Next `digest`.
 */
export function buildUnexpectedErrorDiagnostics(
  error: Error & { digest?: string },
): UnexpectedErrorDiagnostics {
  const withMeta = error as ErrorWithSupportMetadata;
  const cause = error.cause as ErrorWithSupportMetadata | undefined;

  return {
    digest: readOptionalString(withMeta.digest),
    traceId:
      readOptionalString(withMeta.traceId) ??
      readOptionalString(cause?.traceId),
    errorCode:
      readOptionalString(withMeta.errorCode) ??
      readOptionalString(cause?.errorCode),
    statusCode:
      readOptionalNumber(withMeta.statusCode) ??
      readOptionalNumber(cause?.statusCode),
  };
}

export function formatUnexpectedErrorClipboard(
  diagnostics: UnexpectedErrorDiagnostics,
  extras: { path?: string; statusLabel?: string; details?: string },
): string {
  const lines = ["Endatix Hub error"];

  if (extras.path) {
    lines.push(`Path: ${extras.path}`);
  }

  lines.push(`Timestamp: ${new Date().toISOString()}`);

  lines.push(
    diagnostics.digest ? `Digest: ${diagnostics.digest}` : "Digest: n/a",
  );

  if (diagnostics.traceId) {
    lines.push(`Trace ID: ${diagnostics.traceId}`);
  }

  if (diagnostics.errorCode) {
    lines.push(`Error code: ${diagnostics.errorCode}`);
  }

  const httpStatus = diagnostics.statusCode ?? extras.statusLabel;
  if (httpStatus !== undefined) {
    lines.push(`HTTP status: ${httpStatus}`);
  }

  if (extras.details) {
    lines.push(`Details: ${extras.details}`);
  }

  return lines.join("\n");
}
