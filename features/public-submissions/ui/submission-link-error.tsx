import {
  PublicStatusPage,
  type PublicStatusTone,
} from "@/components/public-status/public-status-page";
import {
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
        icon: Link2Off,
        tone: "neutral",
        title: "This link has expired.",
        message: `Request a new access link to ${action} this submission.`,
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
