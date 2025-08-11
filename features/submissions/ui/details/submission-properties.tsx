import { getElapsedTimeString, parseDate } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { CellCompleteStatus } from "../table/cell-complete-status";
import { PropertyDisplay } from "./property-display";
import { Submission } from "@/lib/endatix-api";
import { CellStatusDropdown } from "../table/cell-status-dropdown";

interface SubmissionPropertiesProps {
  submission: Submission;
}

const getFormattedDate = (date?: Date): string => {
  if (!date) {
    return "-";
  }

  const parsedDate = parseDate(date);
  if (!parsedDate) {
    return "-";
  }

  return parsedDate.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour12: true,
  });
};

export function SubmissionProperties({
  submission,
}: SubmissionPropertiesProps) {
  let submissionLanguage: string | null = null;
  try {
    if (submission?.metadata) {
      const parsed = JSON.parse(submission.metadata);
      if (parsed?.language && typeof parsed.language === "string") {
        submissionLanguage = parsed.language;
      }
    }
  } catch {}

  const getLanguageDisplayName = (code: string): string => {
    try {
      // Normalize code (e.g., en-US) and ask for English display name
      const displayNames = new Intl.DisplayNames(["en"], { type: "language" });
      return displayNames.of(code) ?? code;
    } catch {
      return code;
    }
  };

  return (
    <div className="px-4">
      <PropertyDisplay label="Created at">
        {getFormattedDate(submission.createdAt)}
      </PropertyDisplay>
      <PropertyDisplay label="Is Complete?" valueClassName="uppercase">
        <CellCompleteStatus isComplete={submission.isComplete} />
      </PropertyDisplay>
      <PropertyDisplay label="Completed at">
        {getFormattedDate(submission.completedAt)}
      </PropertyDisplay>
      {submission.isComplete && (
        <PropertyDisplay label="Completion time">
          {getElapsedTimeString(
            submission.createdAt,
            submission.completedAt,
            "long",
          )}
        </PropertyDisplay>
      )}
      <PropertyDisplay label="Status">
        <CellStatusDropdown
          code={submission.status}
          submissionId={submission.id}
          formId={submission.formId}
        />
      </PropertyDisplay>
      <PropertyDisplay label="Last modified on">
        {getFormattedDate(submission.modifiedAt)}
      </PropertyDisplay>
      {submissionLanguage && (
        <PropertyDisplay label="Submission language">
          <span className="inline-flex items-center gap-2">
            {getLanguageDisplayName(submissionLanguage)}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">
                    You can switch the display language in the View menu.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
        </PropertyDisplay>
      )}
    </div>
  );
}
