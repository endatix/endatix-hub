import type { ReactNode } from "react";
import type { Table as TanstackTable } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import "./data-table-column-meta";
import {
  dataTableBodyCellClassName,
  dataTableBodyRowClassName,
} from "./data-table-chrome";

interface DataTableSkeletonRowColumn {
  id: string;
  className?: string;
  isPinnedLeft?: boolean;
  /** Placeholder shape; defaults to a short bar. */
  cell?: ReactNode;
}

interface DataTableSkeletonRowsProps {
  columns: readonly DataTableSkeletonRowColumn[];
  rows: number;
}

/**
 * Placeholder body rows. The one loading look for list rows: the initial
 * skeleton and every page, filter, or sort change render these under a
 * header that stays mounted (so header filters keep their state).
 */
export function DataTableSkeletonRows({
  columns,
  rows,
}: Readonly<DataTableSkeletonRowsProps>) {
  return Array.from({ length: rows }, (_, rowIndex) => {
    const isEvenRow = rowIndex % 2 === 1;
    return (
      <TableRow
        key={rowIndex}
        data-slot="data-table-skeleton-row"
        className={dataTableBodyRowClassName({ isEvenRow, isStatic: true })}
      >
        {columns.map((column) => (
          <TableCell
            key={column.id}
            className={dataTableBodyCellClassName({
              isEvenRow,
              isPinnedLeft: column.isPinnedLeft,
              className: column.className,
            })}
          >
            {column.cell ?? <Skeleton className="h-4 w-24" />}
          </TableCell>
        ))}
      </TableRow>
    );
  });
}

/**
 * The body of a TanStack grid while its next page, filter, or sort is in
 * flight: as many skeleton rows as are on screen (a few if the list was
 * empty), shaped like the visible columns.
 */
export function DataTablePendingRows<TData>({
  table,
}: Readonly<{ table: TanstackTable<TData> }>) {
  const rows = table.getRowModel().rows.length;
  return (
    <DataTableSkeletonRows
      rows={rows > 0 ? rows : 5}
      columns={table.getVisibleLeafColumns().map((column) => ({
        id: column.id,
        isPinnedLeft: column.getIsPinned() === "left",
        className: column.columnDef.meta?.cellClassName,
      }))}
    />
  );
}
