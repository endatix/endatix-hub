import {
  DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
  DataTableSkeleton,
  type DataTableSkeletonColumn,
} from "@/components/table";

const COLUMNS: readonly DataTableSkeletonColumn[] = [
  { title: "Email", className: "min-w-[12rem]" },
  { title: "Company" },
  { title: "Status", className: DATA_TABLE_SHRINK_WRAP_CLASS_NAME },
  {
    title: "Created",
    className: `hidden md:table-cell ${DATA_TABLE_SHRINK_WRAP_CLASS_NAME}`,
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
