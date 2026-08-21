'use client';

import {
  DataTableColumnHeader,
  DateFilterControls,
  getColumnHeaderChromeClassName,
  getColumnHeaderTitleSwapClassName,
  TextFilterControls,
  type DataTableColumnHeaderProps,
} from '@/components/table/data-table-column-header';
import { useColumnVisibility } from './column-visibility-context';

export {
  DateFilterControls,
  getColumnHeaderChromeClassName,
  getColumnHeaderTitleSwapClassName,
  TextFilterControls,
};

/**
 * Submissions column header — shared chrome with Hide wired to column visibility.
 */
export function ColumnHeader<TData, TValue>(
  props: Omit<DataTableColumnHeaderProps<TData, TValue>, 'onHideColumn'>,
) {
  const { toggleColumnVisibility } = useColumnVisibility();

  return (
    <DataTableColumnHeader
      {...props}
      onHideColumn={() => toggleColumnVisibility(props.column.id)}
    />
  );
}
