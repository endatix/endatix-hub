import type { PublicSurveyVariant } from "@/features/public-form/types";
import { PublicStatusPage } from "@/components/public-status/public-status-page";
import { CircleOff } from "lucide-react";

const TITLE = "Response recorded";
const MESSAGE = "This response is closed and cannot be continued.";

export default function SubmissionClosed({
  variant,
  children,
}: Readonly<{ variant: PublicSurveyVariant; children?: React.ReactNode }>) {
  return (
    <PublicStatusPage
      icon={CircleOff}
      message={MESSAGE}
      title={TITLE}
      tone="neutral"
      layout={variant === "embed" ? "embed" : "page"}
    >
      {children}
    </PublicStatusPage>
  );
}
