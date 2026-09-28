import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import {
  PublicStatusPage,
  type PublicStatusTone,
} from "@/components/public-status/public-status-page";
import {
  Hourglass,
  Link2Off,
  SearchX,
  ShieldX,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

/** Why a `/view` or `/edit` submission link could not open. */
export type SubmissionLinkErrorKind =
  | "invalidLink"
  | "tokenRequired"
  | "forbidden"
  /** Any rejected token - expired or not genuine. The page does not say which. */
  | "expired"
  | "notFound"
  | "formUnavailable";

/** What the link was for; it is the verb in the copy. */
export type SubmissionLinkAction = "view" | "edit";

type Presentation = {
  icon: LucideIcon;
  tone: PublicStatusTone;
  title: string;
  message: string;
  note?: string;
};

function getPresentation(
  kind: SubmissionLinkErrorKind,
  action: SubmissionLinkAction,
): Presentation {
  switch (kind) {
    case "invalidLink":
      return {
        icon: SearchX,
        tone: "neutral",
        title: "This link isn't valid.",
        message: "Check the link and try again.",
      };
    case "tokenRequired":
      return {
        icon: Link2Off,
        tone: "neutral",
        title: "This link is incomplete.",
        message: `You need a valid access link to ${action} this submission.`,
      };
    case "forbidden":
      return {
        icon: ShieldX,
        tone: "neutral",
        title: `You can't ${action} this submission.`,
        message: `The access link does not include ${action} permission.`,
      };
    case "expired":
      return {
        // Same copy as the share page's token error: one answer for every token failure.
        icon: Hourglass,
        tone: "neutral",
        title: "This link is invalid or has expired.",
        message: `Access links work for a limited time and only when copied in full. Ask whoever shared it for a new link to ${action} this submission.`,
        note: "You can close this tab.",
      };
    case "notFound":
      return {
        icon: SearchX,
        tone: "neutral",
        title: "We couldn't find that submission.",
        message: "It may have been deleted, or the link is invalid.",
      };
    case "formUnavailable":
      return {
        icon: TriangleAlert,
        tone: "warning",
        title: "Unable to load form",
        message: "Please try again later.",
      };
  }
}

/**
 * Every failed `/view` or `/edit` submission link. Same copy as the share page's
 * token errors, with the link's own verb. `formUnavailable` is the definition
 * failure after the submission itself loaded.
 */
export function SubmissionLinkError({
  kind,
  action,
}: Readonly<{ kind: SubmissionLinkErrorKind; action: SubmissionLinkAction }>) {
  return <PublicStatusPage {...getPresentation(kind, action)} layout="page" />;
}

const TOKEN_FAILURE_CODES: ReadonlySet<string> = new Set([
  ERROR_CODE.INVALID_TOKEN,
  ERROR_CODE.INVALID_ACCESS_TOKEN,
  ERROR_CODE.TOKEN_EXPIRED,
]);

/**
 * Maps a failed access-token submission load onto a page. A tampered or truncated
 * token lands on the same page as an expired one, never on "not found": that page
 * suggests the submission was deleted, and a distinct answer tells a guesser which
 * check failed.
 */
export function getSubmissionLinkFailureKind(failure: {
  message: string;
  errorCode?: string;
}): SubmissionLinkErrorKind {
  const message = failure.message.toLowerCase();

  if (
    (failure.errorCode && TOKEN_FAILURE_CODES.has(failure.errorCode)) ||
    message.includes("expired") ||
    message.includes("invalid access token")
  ) {
    return "expired";
  }

  if (message.includes("permission") || message.includes("forbidden")) {
    return "forbidden";
  }

  return "notFound";
}
