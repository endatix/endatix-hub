import { NotFoundComponent } from "@/components/error-handling/not-found/not-found-component";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";

type TokenSubmissionErrorCopy = {
  title: string;
  subtitle: string;
  message: string;
};

const EXPIRED_COPY: TokenSubmissionErrorCopy = {
  title: "Token Expired",
  subtitle: "This link has expired",
  message: "Please request a new access link to continue.",
};

const FORBIDDEN_COPY: TokenSubmissionErrorCopy = {
  title: "Access Denied",
  subtitle: "You don't have permission to access this submission",
  message: "The access token does not have the required permissions.",
};

const NOT_FOUND_COPY: TokenSubmissionErrorCopy = {
  title: "Submission Not Found",
  subtitle: "Unable to load submission",
  message: "The submission may have been deleted or the token is invalid.",
};

const TOKEN_SUBMISSION_ERROR_COPY: Record<string, TokenSubmissionErrorCopy> = {
  [ERROR_CODE.INVALID_TOKEN]: EXPIRED_COPY,
  [ERROR_CODE.SUBMISSION_TOKEN_INVALID]: EXPIRED_COPY,
  [ERROR_CODE.ACCESS_FORBIDDEN]: FORBIDDEN_COPY,
  [ERROR_CODE.AUTHENTICATION_REQUIRED]: FORBIDDEN_COPY,
  [ERROR_CODE.RESOURCE_NOT_FOUND]: NOT_FOUND_COPY,
};

export function TokenSubmissionError({
  errorCode,
}: Readonly<{ errorCode: string }>) {
  const copy = TOKEN_SUBMISSION_ERROR_COPY[errorCode] ?? NOT_FOUND_COPY;

  return (
    <NotFoundComponent
      notFoundTitle={copy.title}
      notFoundSubtitle={copy.subtitle}
      notFoundMessage={copy.message}
      titleSize="medium"
    />
  );
}
