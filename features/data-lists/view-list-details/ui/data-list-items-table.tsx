'use client';

import {
  DATA_TABLE_ELEMENT_CLASS_NAME,
  DataTableColumnHeader,
  dataTableBodyCellClassName,
  dataTableBodyRowClassName,
  dataTableColumnLabelClassName,
  dataTableHeaderCellClassName,
  DataTableEmpty,
  DataTableSurface,
} from '@/components/table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatLocaleLabel } from '@/features/data-lists/translations/locale-discovery';
import type { DataListItem } from '@/lib/endatix-api/data-lists/types';
import { resolveCatalogDefaultLabelText } from '@/lib/localization';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { type ReactNode, useMemo } from 'react';
import './table-types';

type DataListItemsTableProps = {
  items: DataListItem[];
  availableLocales: string[];
  defaultLocale?: string;
  emptyMessage?: string;
  footer?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

type DataListItemRow = DataListItem & { rowId: string };

function resolveItemLabelText(
  item: DataListItemRow,
  column: string,
  defaultLocale?: string,
): string {
  if (column === "default") {
    return (
      resolveCatalogDefaultLabelText(item.labels, defaultLocale)?.trim() || "—"
    );
  }

  return item.labels[column]?.trim() || "—";
}

function labelColumnHeader(column: string, defaultLocale?: string): string {
  if (column === "default") {
    return `default (${defaultLocale ?? "—"})`;
  }

  return formatLocaleLabel(column);
}

function buildColumns(
  labelColumns: string[],
  defaultLocale: string | undefined,
  searchValue: string,
  onSearchChange: ((value: string) => void) | undefined,
): ColumnDef<DataListItemRow>[] {
  return [
    {
      id: 'value',
      accessorKey: 'value',
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Value"
          textFilter={
            onSearchChange
              ? {
                  value: searchValue,
                  placeholder: 'Search value or label',
                  onChange: onSearchChange,
                }
              : undefined
          }
        />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.value}</span>
      ),
      meta: {
        headerClassName: 'min-w-[8rem]',
        cellClassName: 'min-w-[8rem]',
      },
    },
    ...labelColumns.map((column) => ({
      id: `label:${column}`,
      enableSorting: false as const,
      header: () => (
        <span className={dataTableColumnLabelClassName()}>
          {labelColumnHeader(column, defaultLocale)}
        </span>
      ),
      cell: ({ row }: { row: { original: DataListItemRow } }) =>
        resolveItemLabelText(row.original, column, defaultLocale),
      meta: {
        headerClassName: 'min-w-[10rem]',
        cellClassName: 'min-w-[10rem]',
      },
    })),
  ];
}

export function DataListItemsTable({
  items,
  availableLocales,
  defaultLocale,
  emptyMessage = 'No items in this list.',
  footer,
  searchValue = '',
  onSearchChange,
}: Readonly<DataListItemsTableProps>) {
  const labelColumns = useMemo(
    () => ['default', ...availableLocales],
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
    () =>
      buildColumns(labelColumns, defaultLocale, searchValue, onSearchChange),
    [labelColumns, defaultLocale, searchValue, onSearchChange],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.rowId,
    enableColumnPinning: true,
    initialState: {
      columnPinning: {
        left: ['value'],
      },
    },
  });

  const rows = table.getRowModel().rows;

  if (rows.length === 0) {
    return (
      <DataTableSurface data-slot="data-list-items-table">
        <DataTableEmpty>{emptyMessage}</DataTableEmpty>
        {footer}
      </DataTableSurface>
    );
  }

  return (
    <DataTableSurface data-slot="data-list-items-table">
      <div className="w-full overflow-x-auto">
        <Table className={DATA_TABLE_ELEMENT_CLASS_NAME}>
          <TableHeader className="bg-surface-container-low">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-0 hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => {
                  const isPinnedLeft = header.column.getIsPinned() === 'left';
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={dataTableHeaderCellClassName({
                        isPinnedLeft,
                        className:
                          header.column.columnDef.meta?.headerClassName,
                      })}
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
                  className={dataTableBodyRowClassName({ isEvenRow })}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isPinnedLeft = cell.column.getIsPinned() === 'left';
                    return (
                      <TableCell
                        key={cell.id}
                        className={dataTableBodyCellClassName({
                          isPinnedLeft,
                          isEvenRow,
                          className: cell.column.columnDef.meta?.cellClassName,
                        })}
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
      {footer}
    </DataTableSurface>
  );
}
