"use client";

import type { ReactNode } from "react";
import {
  DATA_TABLE_ELEMENT_CLASS_NAME,
  dataTableBodyCellClassName,
  dataTableBodyRowClassName,
  dataTableHeaderCellClassName,
} from "./data-table-chrome";
import { ColumnResizeHandle, resizedColumnStyle } from "./column-resize-handle";
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
import {
  flexRender,
  type Header,
  type Row,
  type Table as TanstackTable,
} from "@tanstack/react-table";

type DataTableGridProps<TData> = {
  table: TanstackTable<TData>;
  empty: ReactNode;
  hasRows: boolean;
  /**
   * The next page, filter, or sort is on its way: keep the header (and its
   * filters) mounted and show skeleton rows in place of the current ones.
   */
  isPending?: boolean;
  /**
   * Makes every row a click target. Controls inside a cell that must not
   * trigger it stop the click's propagation.
   */
  onRowClick?: (row: Row<TData>) => void;
};

/**
 * Shared TanStack header/body chrome used by Hub list surfaces. A table with
 * `enableColumnResizing: true` gets resize handles; a resized column keeps
 * its `columnSizing` width, the others stay automatic.
 */
export function DataTableGrid<TData>({
  table,
  empty,
  hasRows,
  isPending = false,
  onRowClick,
}: Readonly<DataTableGridProps<TData>>) {
  const heldHeight = useHeldHeight(isPending);

  if (!hasRows && !isPending) {
    return empty;
  }

  return (
    <div
      ref={heldHeight.ref}
      style={heldHeight.style}
      className="w-full overflow-x-auto"
    >
      <Table className={DATA_TABLE_ELEMENT_CLASS_NAME}>
        <GridHeader table={table} />
        <TableBody aria-busy={isPending || undefined}>
          {isPending ? (
            <DataTablePendingRows table={table} />
          ) : (
            <GridBodyRows table={table} onRowClick={onRowClick} />
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function GridHeader<TData>({
  table,
}: Readonly<{ table: TanstackTable<TData> }>) {
  return (
    <TableHeader className="bg-surface-container-low">
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow
          key={headerGroup.id}
          className="border-0 hover:bg-transparent"
        >
          {headerGroup.headers.map((header) => (
            <GridHeaderCell key={header.id} header={header} />
          ))}
        </TableRow>
      ))}
    </TableHeader>
  );
}

function GridHeaderCell<TData>({
  header,
}: Readonly<{ header: Header<TData, unknown> }>) {
  const isResizable = header.getContext().table.options.enableColumnResizing;
  return (
    <TableHead
      colSpan={header.colSpan}
      className={dataTableHeaderCellClassName({
        isPinnedLeft: header.column.getIsPinned() === "left",
        className: header.column.columnDef.meta?.headerClassName,
      })}
      style={resizedColumnStyle(header.getContext().table, header.column)}
    >
      {header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext())}
      {isResizable === true && <ColumnResizeHandle header={header} />}
    </TableHead>
  );
}

type GridBodyRowsProps<TData> = Pick<
  DataTableGridProps<TData>,
  "table" | "onRowClick"
>;

function GridBodyRows<TData>({
  table,
  onRowClick,
}: Readonly<GridBodyRowsProps<TData>>) {
  return table.getRowModel().rows.map((row, rowIndex) => {
    const isEvenRow = rowIndex % 2 === 1;
    return (
      <TableRow
        key={row.id}
        className={dataTableBodyRowClassName({
          isEvenRow,
          className: onRowClick ? "cursor-pointer" : undefined,
        })}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
      >
        <GridBodyCells row={row} isEvenRow={isEvenRow} />
      </TableRow>
    );
  });
}

function GridBodyCells<TData>({
  row,
  isEvenRow,
}: Readonly<{ row: Row<TData>; isEvenRow: boolean }>) {
  return row.getVisibleCells().map((cell) => (
    <TableCell
      key={cell.id}
      className={dataTableBodyCellClassName({
        isPinnedLeft: cell.column.getIsPinned() === "left",
        isEvenRow,
        className: cell.column.columnDef.meta?.cellClassName,
      })}
      style={resizedColumnStyle(cell.getContext().table, cell.column)}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </TableCell>
  ));
}
