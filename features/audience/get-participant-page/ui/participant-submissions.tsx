"use client";

import { FileText } from "lucide-react";
import { useId } from "react";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import {
  CellDate,
  DATA_TABLE_SHRINK_WRAP_CLASS_NAME as SHRINK,
  DataTableEmpty,
  DataTableSurface,
  StaticDataTable,
  StaticDataTableRow,
  dataTableCell,
  type StaticDataTableColumn,
} from "@/components/table";
import type { ParticipantSubmission } from "@/lib/endatix-api/audience/types";
import {
  PersonalizationSource,
  type PersonalizationSource as SnapshotSource,
} from "@/lib/endatix-api/submissions/types";
import { NotSet } from "../../ui/not-set";
import { SubmissionLink } from "../../ui/submission-link";
import { WithTestBadge } from "../../ui/test-badge";

const COLUMNS: StaticDataTableColumn[] = [
  { key: "created", label: "Created", className: "min-w-[12rem]" },
  { key: "status", label: "Status", className: SHRINK },
  { key: "source", label: "Source", className: SHRINK },
  { key: "open", label: "Details", className: `text-right ${SHRINK}` },
];

const SOURCE_LABEL: Record<SnapshotSource, string> = {
  [PersonalizationSource.Link]: "Personalized link",
  [PersonalizationSource.OnBehalf]: "On behalf",
  [PersonalizationSource.Test]: "Test",
};

/** The read carries only `isComplete`, so these two are all it can say (labels as in Submissions). */
const COMPLETION: Record<
  "complete" | "inProgress",
  { tone: StatusTone; label: string }
> = {
  complete: { tone: "on", label: "Complete" },
  inProgress: { tone: "attention", label: "In progress" },
};

/** A test submission carries the Test badge beside when it was created. */
function CreatedCell({
  submission,
}: Readonly<{ submission: ParticipantSubmission }>) {
  return (
    <WithTestBadge isTest={submission.isTest}>
      <CellDate date={submission.createdAt} />
    </WithTestBadge>
  );
}

function StatusCell({
  submission,
}: Readonly<{ submission: ParticipantSubmission }>) {
  const completion = submission.isComplete ? "complete" : "inProgress";
  return <StatusBadge {...COMPLETION[completion]} />;
}

/** Who froze its values; `—` when the submission has no Snapshot. */
function SourceCell({
  submission,
}: Readonly<{ submission: ParticipantSubmission }>) {
  const { snapshotSource } = submission;
  if (!snapshotSource) return <NotSet label="No Snapshot" />;
  return SOURCE_LABEL[snapshotSource];
}

function submissionCells(formId: string, submission: ParticipantSubmission) {
  return [
    dataTableCell("created", <CreatedCell submission={submission} />),
    dataTableCell("status", <StatusCell submission={submission} />, SHRINK),
    dataTableCell("source", <SourceCell submission={submission} />, SHRINK),
    dataTableCell(
      "open",
      <SubmissionLink
        formId={formId}
        submissionId={submission.id}
        srLabel={` submission ${submission.id}`}
      >
        View
      </SubmissionLink>,
      `text-right ${SHRINK}`,
    ),
  ];
}

type ParticipantSubmissionsProps = {
  formId: string;
  submissions: ParticipantSubmission[];
  total: number;
};

function SubmissionsTable({
  formId,
  submissions,
}: Readonly<ParticipantSubmissionsProps>) {
  return (
    <StaticDataTable columns={COLUMNS}>
      {submissions.map((submission, index) => (
        <StaticDataTableRow
          key={submission.id}
          index={index}
          cells={submissionCells(formId, submission)}
        />
      ))}
    </StaticDataTable>
  );
}

/** "2 submissions" when all are shown; "Newest 50 of 137" when the read cut the list. */
function countLine({ submissions, total }: ParticipantSubmissionsProps) {
  if (submissions.length < total)
    return `Newest ${submissions.length} of ${total}`;
  return total === 1 ? "1 submission" : `${total} submissions`;
}

function SubmissionsHeader({
  headingId,
  ...props
}: Readonly<ParticipantSubmissionsProps & { headingId: string }>) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id={headingId} className="text-lg font-semibold">
        Submissions
      </h2>
      {props.total > 0 ? (
        <p className="text-sm text-muted-foreground">{countLine(props)}</p>
      ) : null}
    </div>
  );
}

const NO_SUBMISSIONS = (
  <DataTableEmpty icon={FileText} title="No submissions yet">
    Their submissions on this form show here, test ones included.
  </DataTableEmpty>
);

/**
 * Their submissions on this form, newest first: the link's, the ones made on their behalf, and
 * test submissions made as them. Each opens Submission Details.
 */
export function ParticipantSubmissions(
  props: Readonly<ParticipantSubmissionsProps>,
) {
  const headingId = useId();
  const empty = props.submissions.length === 0;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <SubmissionsHeader {...props} headingId={headingId} />
      <DataTableSurface>
        {empty ? NO_SUBMISSIONS : <SubmissionsTable {...props} />}
      </DataTableSurface>
    </section>
  );
}
