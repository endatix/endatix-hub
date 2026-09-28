import type { PublicSurveyVariant } from "@/features/public-form/types";
import { EmbedHeightReporter } from "@/features/public-form/ui/embed-height-reporter";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { resolveErrorPresentation } from "@/lib/errors/error-presentation";
import { Hourglass, SearchX, ShieldX, type LucideIcon } from "lucide-react";
import { PublicStatusPage } from "@/components/public-status/public-status-page";

type TokenErrorPresentation = {
  icon: LucideIcon;
  title: string;
  message: string;
  /** Page layout only: an embed is not a tab the reader can close. */
  note?: string;
};

// One page for every token failure - expired, tampered, truncated. The reader cannot fix
// any of them differently, and one answer does not tell a guesser which check failed.
// Same shape as the PDF export's page: why, who can fix it, then the note.
const EXPIRED_COPY: TokenErrorPresentation = {
  icon: Hourglass,
  title: "This link is invalid or has expired.",
  message:
    "Access links work for a limited time and only when copied in full. Ask whoever shared it for a new link to continue.",
  note: "You can close this tab.",
};

const FORBIDDEN_COPY: TokenErrorPresentation = {
  icon: ShieldX,
  title: "You can't open this submission.",
  message: "The access link does not carry the required permissions.",
};

const NOT_FOUND_COPY: TokenErrorPresentation = {
  icon: SearchX,
  title: "We couldn't find that submission.",
  message: "It may have been deleted, or the link is invalid.",
};

const TOKEN_SUBMISSION_ERROR_COPY: Record<string, TokenErrorPresentation> = {
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
  variant,
}: Readonly<{ errorCode: string; variant: PublicSurveyVariant }>) {
  const { icon, title, message, note } = resolveErrorPresentation(
    TOKEN_SUBMISSION_ERROR_COPY,
    errorCode,
    NOT_FOUND_COPY,
  );

  return (
    <>
      {variant === "embed" && <EmbedHeightReporter />}
      <PublicStatusPage
        icon={icon}
        message={message}
        note={variant === "embed" ? undefined : note}
        title={title}
        tone="neutral"
        layout={variant === "embed" ? "embed" : "page"}
      />
    </>
  );
}
