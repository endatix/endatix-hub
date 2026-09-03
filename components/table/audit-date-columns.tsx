"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { DateInput } from "@/lib/date-utils";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { CellDate } from "./cell-date";
import { DATA_TABLE_SHRINK_WRAP_CLASS_NAME } from "./data-table-chrome";
import "./data-table-column-meta";
import { DataTableColumnHeader } from "./data-table-column-header";
import type { DateFilterValue } from "./date-filter-types";

/** Rows carrying the audit stamps every Endatix list entity exposes. */
export interface AuditDates {
  createdAt?: DateInput;
  modifiedAt?: DateInput;
}

interface AuditDateColumnsOptions {
  created: DateFilterValue;
  modified: DateFilterValue;
  updateUrl: UrlSearchParamsUpdater;
}

const AUDIT_CELL_CLASS_NAME = `hidden md:table-cell ${DATA_TABLE_SHRINK_WRAP_CLASS_NAME}`;

/**
 * The `Created` / `Modified` pair every Hub list table ends with: sortable by
 * the matching `sortBy` id, filtered through `<prefix>From` / `<prefix>To`.
 */
export function auditDateColumns<TData extends AuditDates>({
  created,
  modified,
  updateUrl,
}: AuditDateColumnsOptions): ColumnDef<TData>[] {
  return [
    auditDateColumn("created", "Created", created, updateUrl),
    auditDateColumn("modified", "Modified", modified, updateUrl),
  ];
}

function auditDateColumn<TData extends AuditDates>(
  prefix: "created" | "modified",
  title: string,
  value: DateFilterValue,
  updateUrl: UrlSearchParamsUpdater,
): ColumnDef<TData> {
  const field = `${prefix}At` as const;

  return {
    id: field,
    accessorKey: field,
    enableSorting: true,
    meta: {
      headerClassName: AUDIT_CELL_CLASS_NAME,
      cellClassName: AUDIT_CELL_CLASS_NAME,
    },
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={title}
        isSorted={column.getIsSorted()}
        dateFilter={{
          value,
          onChange: (next) =>
            updateUrl({
              [`${prefix}From`]: next.from ?? null,
              [`${prefix}To`]: next.to ?? null,
              page: "1",
            }),
        }}
      />
    ),
    cell: ({ row }) => <CellDate date={row.original[field]} />,
  } as ColumnDef<TData>;
}
