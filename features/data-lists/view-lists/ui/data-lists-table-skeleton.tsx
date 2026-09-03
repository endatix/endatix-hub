import {
  DataTableSkeleton,
  type DataTableSkeletonColumn,
} from "@/components/table";
import { Skeleton } from "@/components/ui/skeleton";

const COLUMNS: readonly DataTableSkeletonColumn[] = [
  {
    title: "Friendly Name",
    className: "min-w-[12rem]",
    cell: (
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
    ),
  },
  { title: "Status", cell: <Skeleton className="h-6 w-16 rounded-full" /> },
  { title: "Locales", cell: <Skeleton className="h-5 w-24 rounded-full" /> },
  {
    title: "Created",
    className: "hidden md:table-cell",
    cell: <Skeleton className="h-4 w-20" />,
  },
  {
    title: "Modified",
    className: "hidden md:table-cell",
    cell: <Skeleton className="h-4 w-20" />,
  },
  {
    title: "Items",
    className: "hidden text-right md:table-cell",
    cell: <Skeleton className="ml-auto h-4 w-10" />,
  },
  {
    title: "Actions",
    className: "text-right",
    cell: <Skeleton className="ml-auto h-8 w-8" />,
  },
];

export function DataListsTableSkeleton() {
  return (
    <DataTableSkeleton
      columns={COLUMNS}
      className="mt-4"
      data-slot="data-lists-table-skeleton"
    />
  );
}
