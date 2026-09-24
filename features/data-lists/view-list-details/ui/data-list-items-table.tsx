"use client";

import { TruncatedId } from "@/components/common/truncated-id";
import {
  DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
  dataTableColumnLabelClassName,
  DataTableColumnHeader,
  DataTableEmpty,
  DataTableGrid,
  DataTableSurface,
} from "@/components/table";
import { formatLocaleLabel } from "@/features/data-lists/translations/locale-discovery";
import type { DataListItem } from "@/lib/endatix-api/data-lists/types";
import { resolveCatalogDefaultLabelText } from "@/lib/localization";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table";
import { type ReactNode, useMemo } from "react";
import "@/components/table/data-table-column-meta";

type DataListItemsTableProps = {
  items: DataListItem[];
  /** Label column keys: `default` and/or culture codes. */
  labelColumns: readonly string[];
  defaultLocale?: string;
  emptyMessage?: string;
  footer?: ReactNode;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  isPending?: boolean;
};

type DataListItemRow = DataListItem & { rowId: string };

function buildColumns(
  labelColumns: readonly string[],
  defaultLocale: string | undefined,
  sortingEnabled: boolean,
): ColumnDef<DataListItemRow>[] {
  return [
    {
      id: "value",
      accessorKey: "value",
      enableSorting: sortingEnabled,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Value"
          isSorted={column.getIsSorted()}
        />
      ),
      cell: ({ row }) => (
        <TruncatedId id={row.original.value} copyLabel="Copy value" />
      ),
      meta: {
        headerClassName: `${DATA_TABLE_SHRINK_WRAP_CLASS_NAME} min-w-[8rem]`,
        cellClassName: `${DATA_TABLE_SHRINK_WRAP_CLASS_NAME} min-w-[8rem]`,
      },
    },
    ...labelColumns.map(
      (columnKey): ColumnDef<DataListItemRow> => ({
        id: `label:${columnKey}`,
        enableSorting: false,
        header: () => (
          <span className={dataTableColumnLabelClassName()}>
            {columnKey === "default"
              ? `Default (${defaultLocale ?? "—"})`
              : formatLocaleLabel(columnKey)}
          </span>
        ),
        cell: ({ row }) => {
          const text =
            columnKey === "default"
              ? resolveCatalogDefaultLabelText(
                  row.original.labels,
                  defaultLocale,
                )
              : row.original.labels[columnKey];
          return text?.trim() ? text : "—";
        },
        meta: {
          headerClassName: "min-w-[10rem]",
          cellClassName: "min-w-[10rem]",
        },
      }),
    ),
  ];
}

export function DataListItemsTable({
  items,
  labelColumns,
  defaultLocale,
  emptyMessage = "No items in this list.",
  footer,
  sorting = [],
  onSortingChange,
  isPending = false,
}: Readonly<DataListItemsTableProps>) {
  const sortingEnabled = onSortingChange !== undefined;

  const data = useMemo<DataListItemRow[]>(
    () =>
      items.map((item, index) => ({
        ...item,
        rowId: `${item.id || item.value}-${index}`,
      })),
    [items],
  );

  const columns = useMemo(
    () => buildColumns(labelColumns, defaultLocale, sortingEnabled),
    [labelColumns, defaultLocale, sortingEnabled],
  );

  const controlledSorting = sortingEnabled
    ? { state: { sorting }, onSortingChange }
    : {};

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.rowId,
    enableColumnPinning: true,
    manualSorting: sortingEnabled,
    ...controlledSorting,
    initialState: {
      columnPinning: {
        left: ["value"],
      },
    },
  });

  return (
    <DataTableSurface data-slot="data-list-items-table">
      <DataTableGrid
        table={table}
        hasRows={table.getRowModel().rows.length > 0}
        isPending={isPending}
        empty={<DataTableEmpty>{emptyMessage}</DataTableEmpty>}
      />
      {footer}
    </DataTableSurface>
  );
}
