import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";

/**
 * Copy for the public export error page.
 *
 * The page is reached by redirect, so the only thing crossing the URL is one of
 * these codes - never a title or detail. Free text in a query string would let
 * anyone put arbitrary words on an Endatix-branded page, so the wording lives
 * here and the code is just a key.
 */

const EXPORT_ERROR_CODE = Object.freeze({
  TIMEOUT: "timeout",
  UPSTREAM: "upstream",
  EXPIRED: "expired",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not-found",
  INVALID: "invalid",
  UNKNOWN: "unknown",
} as const);

type ExportErrorCode =
  (typeof EXPORT_ERROR_CODE)[keyof typeof EXPORT_ERROR_CODE];

type ExportErrorContent = {
  /** The resolved code itself, so callers can key off it (icons, tests). */
  key: ExportErrorCode;
  /** Short status line above the heading. */
  eyebrow: string;
  title: string;
  description: string;
  /** Whether retrying the same link is worth suggesting at all. */
  retryable: boolean;
  /** Whether to offer a one-click retry button. */
  offersRetry: boolean;
  /**
   * How long the retry stays disabled.
   *
   * A timed-out render is not cancelled when the timeout fires - it keeps
   * consuming CPU until it finishes - so retrying too soon adds load to a server
   * still working off the last request. That case waits longer than an upstream
   * failure, where the far end may already have recovered.
   */
  retryCooldownSeconds: number;
};

const CONTENT: Readonly<
  Record<ExportErrorCode, Omit<ExportErrorContent, "key">>
> = Object.freeze({
  [EXPORT_ERROR_CODE.TIMEOUT]: {
    eyebrow: "Took too long",
    title: "This export is taking longer than expected",
    description:
      "The PDF could not be produced in time. Nothing has been lost. Waiting a moment usually helps, because a less busy server finishes well inside the limit.",
    retryable: true,
    offersRetry: true,
    retryCooldownSeconds: 30,
  },
  [EXPORT_ERROR_CODE.UPSTREAM]: {
    eyebrow: "Service unavailable",
    title: "We could not reach the submission service",
    description:
      "The submission could not be loaded, so the PDF was not generated. This is usually brief - try again in a moment.",
    retryable: true,
    offersRetry: true,
    retryCooldownSeconds: 10,
  },
  [EXPORT_ERROR_CODE.EXPIRED]: {
    eyebrow: "Link expired",
    title: "This export link has expired",
    description:
      "Export links are valid for a limited time. Ask whoever shared it to send a new one.",
    retryable: false,
    offersRetry: false,
    retryCooldownSeconds: 0,
  },
  [EXPORT_ERROR_CODE.FORBIDDEN]: {
    eyebrow: "No access",
    title: "This link cannot export the submission",
    description:
      "The link does not carry export permission. Ask whoever shared it for a link that allows exporting.",
    retryable: false,
    offersRetry: false,
    retryCooldownSeconds: 0,
  },
  [EXPORT_ERROR_CODE.NOT_FOUND]: {
    eyebrow: "Not found",
    title: "We could not find that submission",
    description:
      "It may have been deleted, or the link may be incomplete. Check that you copied the whole link.",
    retryable: false,
    offersRetry: false,
    retryCooldownSeconds: 0,
  },
  [EXPORT_ERROR_CODE.INVALID]: {
    eyebrow: "Invalid link",
    title: "This export link is not valid",
    description:
      "Part of the link is missing or malformed. Check that you copied the whole link, including everything after the question mark.",
    retryable: false,
    offersRetry: false,
    retryCooldownSeconds: 0,
  },
  [EXPORT_ERROR_CODE.UNKNOWN]: {
    eyebrow: "Something went wrong",
    title: "The export could not be completed",
    description:
      "Try again in a moment. If it keeps happening, share this page with your administrator.",
    retryable: true,
    offersRetry: false,
    retryCooldownSeconds: 0,
  },
});

/** Maps an API failure onto a page code. Host-agnostic: status in, code out. */
function resolveExportErrorCode(
  status: number,
  errorCode?: string,
): ExportErrorCode {
  if (errorCode === "pdf_render_timeout") {
    return EXPORT_ERROR_CODE.TIMEOUT;
  }

  if (errorCode === ERROR_CODE.TOKEN_EXPIRED) {
    return EXPORT_ERROR_CODE.EXPIRED;
  }

  switch (status) {
    case 400:
      return EXPORT_ERROR_CODE.INVALID;
    case 401:
      return EXPORT_ERROR_CODE.EXPIRED;
    case 403:
      return EXPORT_ERROR_CODE.FORBIDDEN;
    case 404:
      return EXPORT_ERROR_CODE.NOT_FOUND;
    case 502:
      return EXPORT_ERROR_CODE.UPSTREAM;
    default:
      return EXPORT_ERROR_CODE.UNKNOWN;
  }
}

/** Never throws on an unknown or absent code - the URL is user-controlled. */
function getExportErrorContent(code: string | undefined): ExportErrorContent {
  const known = (Object.values(EXPORT_ERROR_CODE) as string[]).includes(
    code ?? "",
  );
  const key = known ? (code as ExportErrorCode) : EXPORT_ERROR_CODE.UNKNOWN;

  return { key, ...CONTENT[key] };
}

export {
  EXPORT_ERROR_CODE,
  getExportErrorContent,
  resolveExportErrorCode,
  type ExportErrorCode,
  type ExportErrorContent,
};
