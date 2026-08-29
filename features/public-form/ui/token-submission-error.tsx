import { ErrorPage } from "@/components/error-handling/error-page";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import {
  resolveErrorPresentation,
  type ErrorPresentation,
} from "@/lib/errors/error-presentation";

const EXPIRED_COPY: ErrorPresentation = {
  code: "401",
  eyebrow: "Link expired",
  title: "This link has expired.",
  message: "Request a new access link to continue.",
};

const FORBIDDEN_COPY: ErrorPresentation = {
  code: "403",
  eyebrow: "Access denied",
  title: "You can't open this submission.",
  message: "The access link does not carry the required permissions.",
};

const NOT_FOUND_COPY: ErrorPresentation = {
  code: "404",
  eyebrow: "Submission not found",
  title: "We couldn't find that submission.",
  message: "It may have been deleted, or the link is invalid.",
};

const TOKEN_SUBMISSION_ERROR_COPY: Record<string, ErrorPresentation> = {
  [ERROR_CODE.INVALID_TOKEN]: EXPIRED_COPY,
  [ERROR_CODE.INVALID_ACCESS_TOKEN]: EXPIRED_COPY,
  [ERROR_CODE.TOKEN_EXPIRED]: EXPIRED_COPY,
  [ERROR_CODE.SUBMISSION_TOKEN_INVALID]: EXPIRED_COPY,
  [ERROR_CODE.ACCESS_FORBIDDEN]: FORBIDDEN_COPY,
  [ERROR_CODE.AUTHENTICATION_REQUIRED]: FORBIDDEN_COPY,
  [ERROR_CODE.RESOURCE_NOT_FOUND]: NOT_FOUND_COPY,
};

export function TokenSubmissionError({
  errorCode,
}: Readonly<{ errorCode: string }>) {
  const copy = resolveErrorPresentation(
    TOKEN_SUBMISSION_ERROR_COPY,
    errorCode,
    NOT_FOUND_COPY,
  );

  return <ErrorPage {...copy} />;
}
