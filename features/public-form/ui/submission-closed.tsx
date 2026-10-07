import type { PublicSurveyVariant } from "@/features/public-form/types";
import { PublicStatusPage } from "@/components/public-status/public-status-page";
import { CircleOff } from "lucide-react";

const TITLE = "Response recorded";
const MESSAGE = "This response is closed and cannot be continued.";

export default function SubmissionClosed({
  variant,
}: Readonly<{ variant: PublicSurveyVariant }>) {
  return (
    <PublicStatusPage
      icon={CircleOff}
      message={MESSAGE}
      title={TITLE}
      tone="neutral"
      layout={variant === "embed" ? "embed" : "page"}
    />
  );
}
