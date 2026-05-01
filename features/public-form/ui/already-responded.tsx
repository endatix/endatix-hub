import { ClipboardCheck } from "lucide-react";

interface AlreadyRespondedProps {
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

function getAlreadyRespondedContent(metadata?: string): {
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

    if (typeof parsedMetadata !== 'object' || parsedMetadata === null) {
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

export default function AlreadyResponded({ metadata }: AlreadyRespondedProps) {
  const { title, message } = getAlreadyRespondedContent(metadata);

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-16 text-center">
      <h1 className="endatix-error-h1 text-6xl text-primary mb-4">{title}</h1>
      <p className="mt-2 text-muted-foreground">{message}</p>
      <div className="mt-6 flex justify-center">
        <div
          className="flex items-center justify-center"
          style={{
            width: "96px",
            height: "96px",
            borderRadius: "9999px",
            backgroundColor: "#e0f2fe",
          }}
        >
          <ClipboardCheck
            size={48}
            strokeWidth={1.8}
            style={{
              color: "hsl(var(--primary, 221 83% 53%))",
              stroke: "hsl(var(--primary, 221 83% 53%))",
            }}
          />
        </div>
      </div>
    </div>
  );
}
