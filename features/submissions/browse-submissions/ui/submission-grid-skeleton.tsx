import {
  DataTableColumnName,
  dataTableColumnLabelClassName,
  DataTableSkeleton,
  type DataTableSkeletonColumn,
} from "@/components/table";

const METADATA_COLUMNS: readonly DataTableSkeletonColumn[] = [
  { title: "Actions", className: "w-12" },
  { title: "Status" },
  { title: "Last modified" },
  { title: "Started" },
  { title: "Completed" },
  { title: "Created" },
  { title: "Submitter" },
  { title: "Time" },
  { title: "Review" },
];

/** An answer column's header: a question name, or a human label. */
export type SubmissionGridSkeletonAnswer = {
  label: string;
  isQuestionName: boolean;
};

type SubmissionGridSkeletonProps = {
  pageSize: number;
  answers?: readonly SubmissionGridSkeletonAnswer[];
};

export function SubmissionGridSkeleton({
  pageSize,
  answers: answerLabels = [],
}: Readonly<SubmissionGridSkeletonProps>) {
  const unique = new Map(answerLabels.map((answer) => [answer.label, answer]));
  const answers = [...unique.values()].map((answer) =>
    toSkeletonColumn(answer),
  );
  return (
    <DataTableSkeleton
      columns={[...METADATA_COLUMNS, ...answers]}
      rows={pageSize}
      data-slot="submission-grid-skeleton"
    />
  );
}

/** A question name keeps its case and shortens in the middle, as in the grid. */
function toSkeletonColumn({
  label,
  isQuestionName,
}: SubmissionGridSkeletonAnswer): DataTableSkeletonColumn {
  return isQuestionName
    ? {
        title: label,
        titleContent: (
          <DataTableColumnName
            name={label}
            className={dataTableColumnLabelClassName("normal-case")}
          />
        ),
      }
    : { title: label };
}
