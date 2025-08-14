import { getElapsedTimeString, parseDate } from "@/lib/utils";
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
  let submissionMetadata: Record<string, unknown> | null = null;
  try {
    submissionMetadata = submission?.metadata
      ? (JSON.parse(submission.metadata) as Record<string, unknown>)
      : null;
  } catch {
    submissionMetadata = null;
  }

  const submittedByName =
    (submissionMetadata?.["submittedByName"] as string | undefined) ||
    undefined;
  return (
    <div className="px-4">
      <PropertyDisplay label="Created at">
        {getFormattedDate(submission.createdAt)}
      </PropertyDisplay>
      {submission.submittedBy && (
        <PropertyDisplay label="Submitted by (ID)">
          {submission.submittedBy}
        </PropertyDisplay>
      )}
      {submittedByName && (
        <PropertyDisplay label="Submitted by (name)">
          {submittedByName}
        </PropertyDisplay>
      )}
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
    </div>
  );
}
