import type { PublicSurveyVariant } from "@/features/public-form/types";
import { CircleCheck } from "lucide-react";
import { PublicStatusPage } from "@/components/public-status/public-status-page";

interface SubmissionAlreadyCompletedProps {
  variant: PublicSurveyVariant;
  /** At most one action, e.g. starting a new response. */
  children?: React.ReactNode;
}

const DEFAULT_TITLE = "Thank you";
const DEFAULT_MESSAGE = "This form has already been completed.";

export default function SubmissionAlreadyCompleted({
  variant,
  children,
}: Readonly<SubmissionAlreadyCompletedProps>) {
  return (
    <PublicStatusPage
      icon={CircleCheck}
      message={DEFAULT_MESSAGE}
      title={DEFAULT_TITLE}
      tone="success"
      layout={variant === "embed" ? "embed" : "page"}
    >
      {children}
    </PublicStatusPage>
  );
}
