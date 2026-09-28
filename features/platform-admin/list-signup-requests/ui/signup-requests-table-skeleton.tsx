import {
  DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
  DataTableSkeleton,
  type DataTableSkeletonColumn,
} from "@/components/table";

const COLUMNS: readonly DataTableSkeletonColumn[] = [
  { title: "Requester", className: "min-w-[14rem]" },
  { title: "Status", className: DATA_TABLE_SHRINK_WRAP_CLASS_NAME },
  {
    title: "Submitted",
    className: `hidden md:table-cell ${DATA_TABLE_SHRINK_WRAP_CLASS_NAME}`,
  },
  {
    title: "Actions",
    className: `text-right ${DATA_TABLE_SHRINK_WRAP_CLASS_NAME}`,
  },
];

export function SignupRequestsTableSkeleton() {
  return (
    <DataTableSkeleton
      columns={COLUMNS}
      data-slot="signup-requests-table-skeleton"
    />
  );
}
