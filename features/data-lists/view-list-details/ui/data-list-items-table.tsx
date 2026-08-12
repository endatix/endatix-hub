"use client";

import { DATA_TABLE_SURFACE_CLASS_NAME } from "@/components/ui/data-table-surface";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatLocaleLabel } from "@/features/data-lists/translations/locale-discovery";
import type { DataListItem } from "@/lib/endatix-api/data-lists/types";
import { resolveCatalogDefaultLabelText } from "@/lib/localization";
import { cn } from "@/lib/utils";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useMemo } from "react";
import "./table-types";

type DataListItemsTableProps = {
  items: DataListItem[];
  availableLocales: string[];
  defaultLocale?: string;
};

type DataListItemRow = DataListItem & { rowId: string };

function buildColumns(
  labelColumns: string[],
  defaultLocale?: string,
): ColumnDef<DataListItemRow>[] {
  return [
    {
      id: "value",
      accessorKey: "value",
      header: "Value",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.value}</span>
      ),
      meta: {
        headerClassName: "min-w-[8rem]",
        cellClassName: "min-w-[8rem]",
      },
    },
    ...labelColumns.map((column) => ({
      id: `label:${column}`,
      header:
        column === "default"
          ? `default (${defaultLocale ?? "—"})`
          : formatLocaleLabel(column),
      cell: ({ row }: { row: { original: DataListItemRow } }) => {
        const text =
          column === "default"
            ? resolveCatalogDefaultLabelText(
                row.original.labels,
                defaultLocale,
              )
            : row.original.labels[column];
        return text?.trim() ? text : "—";
      },
      meta: {
        headerClassName: "min-w-[10rem]",
        cellClassName: "min-w-[10rem]",
      },
    })),
  ];
}

export function DataListItemsTable({
  items,
  availableLocales,
  defaultLocale,
}: Readonly<DataListItemsTableProps>) {
  const labelColumns = useMemo(
    () => ["default", ...availableLocales],
    [availableLocales],
  );

  const data = useMemo<DataListItemRow[]>(
    () =>
      items.map((item, index) => ({
        ...item,
        rowId: `${item.id || item.value}-${index}`,
      })),
    [items],
  );

  const columns = useMemo(
    () => buildColumns(labelColumns, defaultLocale),
    [labelColumns, defaultLocale],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.rowId,
    enableColumnPinning: true,
    initialState: {
      columnPinning: {
        left: ["value"],
      },
    },
  });

  const rows = table.getRowModel().rows;

  if (rows.length === 0) {
    return (
      <div
        data-slot="data-list-items-table"
        className={DATA_TABLE_SURFACE_CLASS_NAME}
      >
        <div className="flex h-24 items-center justify-center px-6 text-center text-sm text-muted-foreground">
          No items in this list.
        </div>
      </div>
    );
  }

  return (
    <div
      data-slot="data-list-items-table"
      className={DATA_TABLE_SURFACE_CLASS_NAME}
    >
      <div className="w-full overflow-x-auto">
        <Table className="border-separate border-spacing-0">
          <TableHeader className="bg-surface-container-low">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-0 hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => {
                  const isPinned = header.column.getIsPinned();
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        "sticky top-0 h-10 bg-surface-container-low px-2 shadow-[inset_0_-1px_0_0] shadow-border/30",
                        isPinned === "left" ? "left-0 z-30" : "z-10",
                        header.column.columnDef.meta?.headerClassName,
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => {
              const isEvenRow = rowIndex % 2 === 1;
              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    "group border-0",
                    isEvenRow
                      ? "bg-surface-container-low hover:bg-surface-container"
                      : "bg-surface-container-lowest hover:bg-surface-container",
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isPinned = cell.column.getIsPinned();
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "px-2 py-2",
                          isPinned &&
                            "sticky z-20 transition-colors duration-150",
                          isPinned &&
                            (isEvenRow
                              ? "bg-surface-container-low group-hover:bg-surface-container"
                              : "bg-surface-container-lowest group-hover:bg-surface-container"),
                          isPinned === "left" && "left-0",
                          cell.column.columnDef.meta?.cellClassName,
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
