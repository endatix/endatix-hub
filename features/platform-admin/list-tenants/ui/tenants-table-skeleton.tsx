import {
  DataTableSkeleton,
  type DataTableSkeletonColumn,
} from "@/components/table";

const COLUMNS: readonly DataTableSkeletonColumn[] = [
  { title: "Tenant", className: "min-w-[12rem]" },
  { title: "Public id" },
  { title: "Self-reg" },
  { title: "Created", className: "hidden md:table-cell" },
  { title: "Modified", className: "hidden md:table-cell" },
  { title: "Actions", className: "text-right" },
];

export function TenantsTableSkeleton() {
  return (
    <DataTableSkeleton columns={COLUMNS} data-slot="tenants-table-skeleton" />
  );
}
