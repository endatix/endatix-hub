"use client";

import type { ReactNode } from "react";
import {
  DATA_TABLE_ELEMENT_CLASS_NAME,
  dataTableBodyCellClassName,
  dataTableBodyRowClassName,
  dataTableHeaderCellClassName,
} from "./data-table-chrome";
import "./data-table-column-meta";
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
};

/**
 * Shared TanStack header/body chrome used by Hub list surfaces.
 */
export function DataTableGrid<TData>({
  table,
  empty,
  hasRows,
}: Readonly<DataTableGridProps<TData>>) {
  if (!hasRows) {
    return empty;
  }

  return (
    <div className="w-full overflow-x-auto">
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
        <TableBody>
          {table.getRowModel().rows.map((row, rowIndex) => {
            const isEvenRow = rowIndex % 2 === 1;
            return (
              <TableRow
                key={row.id}
                className={dataTableBodyRowClassName({ isEvenRow })}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={dataTableBodyCellClassName({
                      isEvenRow,
                      className: cell.column.columnDef.meta?.cellClassName,
                    })}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
