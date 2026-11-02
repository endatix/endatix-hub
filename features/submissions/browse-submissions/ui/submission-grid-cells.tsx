"use client";

import { StatusBadge } from "@/components/common/status-badge";
import { describeCollectionStatus } from "@/features/submissions/ui/describe-collection-status";
import type { SubmissionGridRow } from "@/lib/endatix-api/reporting/submission-grid-types";
import { getElapsedTimeString, getSubmissionStartedAt } from "@/lib/utils";
import {
  formatAnswerValue,
  readAnswer,
  type AnswerColumn,
} from "../submission-grid-columns";

type RowCellProps = { row: SubmissionGridRow };

export function CollectionStatusCell({ row }: Readonly<RowCellProps>) {
  const view = describeCollectionStatus(row.collectionStatus, row.isComplete);
  return <StatusBadge tone={view.tone} label={view.label} />;
}

export function CompletionTimeCell({ row }: Readonly<RowCellProps>) {
  const completedAt = row.completedAt ? new Date(row.completedAt) : undefined;
  return (
    <div className="whitespace-nowrap">
      {getElapsedTimeString(
        getSubmissionStartedAt(row),
        completedAt,
        "compact",
      )}
    </div>
  );
}

export function AnswerCell({
  row,
  column,
}: Readonly<RowCellProps & { column: AnswerColumn }>) {
  const text = formatAnswerValue(readAnswer(row, column));
  if (text === null) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <span className="block max-w-[18rem] truncate" title={text}>
      {text}
    </span>
  );
}
