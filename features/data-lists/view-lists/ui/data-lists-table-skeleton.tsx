"use client";

import {
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

export function DataListsTableSkeleton() {
  return (
    <DataTableSurface data-slot="data-lists-table-skeleton" className="mt-4">
      <div className="w-full overflow-x-auto">
        <Table className="border-separate border-spacing-0">
          <TableHeader className="bg-surface-container-low">
            <TableRow className="border-0 hover:bg-transparent">
              {[
                "Friendly Name",
                "Status",
                "Locales",
                "Created",
                "Modified",
                "Items",
                "Actions",
              ].map((title) => (
                <TableHead
                  key={title}
                  className={dataTableHeaderCellClassName({})}
                >
                  <span className={dataTableColumnLabelClassName()}>
                    {title}
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
                  <TableCell
                    className={dataTableBodyCellClassName({
                      isEvenRow,
                      className: "min-w-[12rem]",
                    })}
                  >
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </TableCell>
                  <TableCell
                    className={dataTableBodyCellClassName({ isEvenRow })}
                  >
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </TableCell>
                  <TableCell
                    className={dataTableBodyCellClassName({ isEvenRow })}
                  >
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </TableCell>
                  <TableCell
                    className={dataTableBodyCellClassName({
                      isEvenRow,
                      className: "hidden md:table-cell",
                    })}
                  >
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell
                    className={dataTableBodyCellClassName({
                      isEvenRow,
                      className: "hidden md:table-cell",
                    })}
                  >
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell
                    className={dataTableBodyCellClassName({
                      isEvenRow,
                      className: "hidden text-center md:table-cell",
                    })}
                  >
                    <Skeleton className="mx-auto h-4 w-10" />
                  </TableCell>
                  <TableCell
                    className={dataTableBodyCellClassName({
                      isEvenRow,
                      className: "text-right",
                    })}
                  >
                    <Skeleton className="ml-auto h-8 w-8" />
                  </TableCell>
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
