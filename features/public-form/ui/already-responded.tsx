import type { PublicSurveyVariant } from "@/features/public-form/types";
import { ClipboardCheck } from "lucide-react";
import { EmbedAlreadyRespondedReporter } from "./embed-already-responded-reporter";
import { PublicStatusPage } from "@/components/public-status/public-status-page";

interface AlreadyRespondedProps {
  formId: string;
  variant: PublicSurveyVariant;
  metadata?: string;
}

const DEFAULT_TITLE = "Already Responded";
const DEFAULT_ALREADY_RESPONDED_MESSAGE =
  "You have already submitted a response for this form.";

type AlreadyRespondedMetadata = {
  alreadyResponded?: {
    title?: string;
    message?: string;
  };
};

export function getAlreadyRespondedContent(metadata?: string): {
  title: string;
  message: string;
} {
  if (!metadata) {
    return {
      title: DEFAULT_TITLE,
      message: DEFAULT_ALREADY_RESPONDED_MESSAGE,
    };
  }

  try {
    const parsedMetadata = JSON.parse(metadata) as AlreadyRespondedMetadata;

    if (typeof parsedMetadata !== "object" || parsedMetadata === null) {
      return {
        title: DEFAULT_TITLE,
        message: DEFAULT_ALREADY_RESPONDED_MESSAGE,
      };
    }

    const nestedTitle = parsedMetadata.alreadyResponded?.title?.trim();
    const nestedMessage = parsedMetadata.alreadyResponded?.message?.trim();

    return {
      title: nestedTitle || DEFAULT_TITLE,
      message: nestedMessage || DEFAULT_ALREADY_RESPONDED_MESSAGE,
    };
  } catch {
    return {
      title: DEFAULT_TITLE,
      message: DEFAULT_ALREADY_RESPONDED_MESSAGE,
    };
  }
}

export default function AlreadyResponded(
  props: Readonly<AlreadyRespondedProps>,
) {
  const { title, message } = getAlreadyRespondedContent(props.metadata);

  return (
    <>
      {props.variant === "embed" && (
        <EmbedAlreadyRespondedReporter
          formId={props.formId}
          message={message}
        />
      )}
      <PublicStatusPage
        icon={ClipboardCheck}
        message={message}
        title={title}
        tone="success"
        layout={props.variant === "embed" ? "embed" : "page"}
      />
    </>
  );
}
