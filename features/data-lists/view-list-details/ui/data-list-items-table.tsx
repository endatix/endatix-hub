'use client';

import {
  DATA_TABLE_ELEMENT_CLASS_NAME,
  DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
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
  /** Label column keys: `default` and/or culture codes. */
  labelColumns: readonly string[];
  defaultLocale?: string;
  emptyMessage?: string;
  footer?: ReactNode;
};

type DataListItemRow = DataListItem & { rowId: string };

function buildColumns(
  labelColumns: readonly string[],
  defaultLocale: string | undefined,
): ColumnDef<DataListItemRow>[] {
  return [
    {
      id: 'value',
      accessorKey: 'value',
      enableSorting: false,
      header: () => (
        <span className={dataTableColumnLabelClassName()}>Value</span>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.value}</span>
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
            {columnKey === 'default'
              ? `Default (${defaultLocale ?? '—'})`
              : formatLocaleLabel(columnKey)}
          </span>
        ),
        cell: ({ row }) => {
          const text =
            columnKey === 'default'
              ? resolveCatalogDefaultLabelText(
                  row.original.labels,
                  defaultLocale,
                )
              : row.original.labels[columnKey];
          return text?.trim() ? text : '—';
        },
        meta: {
          headerClassName: 'min-w-[10rem]',
          cellClassName: 'min-w-[10rem]',
        },
      }),
    ),
  ];
}

export function DataListItemsTable({
  items,
  labelColumns,
  defaultLocale,
  emptyMessage = 'No items in this list.',
  footer,
}: Readonly<DataListItemsTableProps>) {
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
