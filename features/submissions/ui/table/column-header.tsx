"use client";

import {
  DataTableColumnHeader,
  type DataTableColumnHeaderProps,
} from "@/components/table/data-table-column-header";
import { useColumnVisibility } from "./column-visibility-context";
import type { RowData } from "@tanstack/react-table";

export {
  DateFilterControls,
  getColumnHeaderChromeClassName,
  getColumnHeaderTitleSwapClassName,
  TextFilterControls,
} from "@/components/table/data-table-column-header";

/**
 * Submissions column header — shared chrome with Hide wired to column visibility.
 */
export function ColumnHeader<TData extends RowData, TValue>(
  props: Omit<DataTableColumnHeaderProps<TData, TValue>, "onHideColumn">,
) {
  const { toggleColumnVisibility } = useColumnVisibility();

  return (
    <DataTableColumnHeader
      {...props}
      onHideColumn={() => toggleColumnVisibility(props.column.id)}
    />
  );
}
