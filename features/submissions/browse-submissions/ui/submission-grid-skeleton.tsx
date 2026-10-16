import {
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

type SubmissionGridSkeletonProps = {
  pageSize: number;
  /** Headers of the answer columns that will show, when known. */
  answerTitles?: readonly string[];
};

export function SubmissionGridSkeleton({
  pageSize,
  answerTitles = [],
}: Readonly<SubmissionGridSkeletonProps>) {
  const answers = [...new Set(answerTitles)].map((title) => ({ title }));
  return (
    <DataTableSkeleton
      columns={[...METADATA_COLUMNS, ...answers]}
      rows={pageSize}
      data-slot="submission-grid-skeleton"
    />
  );
}
