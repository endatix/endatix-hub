"use client";

import {
  DATA_TABLE_ELEMENT_CLASS_NAME,
  DataTableSurface,
  dataTableBodyCellClassName,
  dataTableBodyRowClassName,
  dataTableColumnLabelClassName,
  dataTableHeaderCellClassName,
} from "@/components/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SKELETON_ROWS = 8;

const COLUMNS = [
  { title: "Tenant", className: "min-w-[12rem]" },
  { title: "Public id" },
  { title: "ID" },
  { title: "Self-reg" },
  { title: "Forms", className: "hidden text-right md:table-cell" },
  { title: "Submissions", className: "hidden text-right md:table-cell" },
  { title: "Created", className: "hidden md:table-cell" },
  { title: "Modified", className: "hidden md:table-cell" },
  { title: "Actions", className: "text-right" },
] as const;

export function TenantsTableSkeleton() {
  return (
    <DataTableSurface data-slot="tenants-table-skeleton">
      <div className="w-full overflow-x-auto">
        <Table className={DATA_TABLE_ELEMENT_CLASS_NAME}>
          <TableHeader className="bg-surface-container-low">
            <TableRow className="border-0 hover:bg-transparent">
              {COLUMNS.map((column) => (
                <TableHead
                  key={column.title}
                  className={dataTableHeaderCellClassName({
                    className: column.className,
                  })}
                >
                  <span className={dataTableColumnLabelClassName()}>
                    {column.title}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: SKELETON_ROWS }, (_, rowIndex) => {
              const isEvenRow = rowIndex % 2 === 1;
              return (
                <TableRow
                  key={rowIndex}
                  className={dataTableBodyRowClassName({ isEvenRow })}
                >
                  {COLUMNS.map((column) => (
                    <TableCell
                      key={column.title}
                      className={dataTableBodyCellClassName({
                        isEvenRow,
                        className: column.className,
                      })}
                    >
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-border/40 px-4 py-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-48" />
      </div>
    </DataTableSurface>
  );
}
