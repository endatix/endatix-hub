import { ClipboardCheck } from "lucide-react";
import styles from "./already-responded.module.css";
import { EmbedAlreadyRespondedReporter } from "./embed-already-responded-reporter";

interface AlreadyRespondedProps {
  formId: string;
  isEmbed: boolean;
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

const embedStyles = {
  container: "already-responded-container",
  content: "already-responded-content",
  title: "already-responded-title",
  message: "already-responded-message",
  iconWrapper: "already-responded-icon-wrapper",
  icon: "already-responded-icon",
} as const;

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

export default function AlreadyResponded(props: AlreadyRespondedProps) {
  const { title, message } = getAlreadyRespondedContent(props.metadata);
  const isEmbed = props.isEmbed === true;
  const classNames = isEmbed ? embedStyles : styles;

  return (
    <div className={classNames.container}>
      {isEmbed && (
        <EmbedAlreadyRespondedReporter
          formId={props.formId}
          message={message}
        />
      )}
      <div className={classNames.content}>
        <h1 className={classNames.title}>{title}</h1>
        <p className={classNames.message}>{message}</p>
        <div className={classNames.iconWrapper}>
          <ClipboardCheck
            className={classNames.icon}
            size={48}
            strokeWidth={1.8}
          />
        </div>
      </div>
    </div>
  );
}
