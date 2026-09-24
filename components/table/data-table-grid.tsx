"use client";

import type { ReactNode } from "react";
import {
  DATA_TABLE_ELEMENT_CLASS_NAME,
  dataTableBodyCellClassName,
  dataTableBodyRowClassName,
  dataTableHeaderCellClassName,
} from "./data-table-chrome";
import "./data-table-column-meta";
import { DataTablePendingRows } from "./data-table-skeleton-rows";
import { useHeldHeight } from "./use-held-height";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { flexRender, type Table as TanstackTable } from "@tanstack/react-table";

type DataTableGridProps<TData> = {
  table: TanstackTable<TData>;
  empty: ReactNode;
  hasRows: boolean;
  /**
   * The next page, filter, or sort is on its way: keep the header (and its
   * filters) mounted and show skeleton rows in place of the current ones.
   */
  isPending?: boolean;
};

/**
 * Shared TanStack header/body chrome used by Hub list surfaces.
 */
export function DataTableGrid<TData>({
  table,
  empty,
  hasRows,
  isPending = false,
}: Readonly<DataTableGridProps<TData>>) {
  const heldHeight = useHeldHeight(isPending);

  if (!hasRows && !isPending) {
    return empty;
  }

  const rows = table.getRowModel().rows;
  const bodyRows = isPending ? (
    <DataTablePendingRows table={table} />
  ) : (
    rows.map((row, rowIndex) => {
      const isEvenRow = rowIndex % 2 === 1;
      return (
        <TableRow
          key={row.id}
          className={dataTableBodyRowClassName({ isEvenRow })}
        >
          {row.getVisibleCells().map((cell) => {
            const isPinnedLeft = cell.column.getIsPinned() === "left";
            return (
              <TableCell
                key={cell.id}
                className={dataTableBodyCellClassName({
                  isPinnedLeft,
                  isEvenRow,
                  className: cell.column.columnDef.meta?.cellClassName,
                })}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            );
          })}
        </TableRow>
      );
    })
  );

  return (
    <div
      ref={heldHeight.ref}
      style={heldHeight.style}
      className="w-full overflow-x-auto"
    >
      <Table className={DATA_TABLE_ELEMENT_CLASS_NAME}>
        <TableHeader className="bg-surface-container-low">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-0 hover:bg-transparent"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  className={dataTableHeaderCellClassName({
                    isPinnedLeft: header.column.getIsPinned() === "left",
                    className: header.column.columnDef.meta?.headerClassName,
                  })}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody aria-busy={isPending || undefined}>{bodyRows}</TableBody>
      </Table>
    </div>
  );
}
