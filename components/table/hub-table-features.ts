import {
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  type Cell as TanstackCell,
  type Column as TanstackColumn,
  type ColumnDef as TanstackColumnDef,
  type Header as TanstackHeader,
  type HeaderContext as TanstackHeaderContext,
  type Row as TanstackRow,
  type RowData,
  type ReactTable as TanstackReactTable,
  type Table as TanstackTable,
} from "@tanstack/react-table";

export type { RowData, SortDirection } from "@tanstack/react-table";

/**
 * The Table 8 bundle, named. Table 9 only includes a feature when it is
 * registered here. Every Hub table passes this object.
 */
export const hubTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowSelectionFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnVisibilityFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
});

export type HubTableFeatures = typeof hubTableFeatures;

/**
 * Options for a list whose rows the server sorts and pages. Without
 * `manualPagination`, Table 9 cuts each server page to its own default of 10
 * rows, because every Hub table registers the paginated row model.
 */
export const serverPagedRows = {
  manualPagination: true,
  manualSorting: true,
} as const;

/** Table 9 types bound to the features Hub tables register. */
export type ColumnDef<
  TData extends RowData,
  TValue = unknown,
> = TanstackColumnDef<HubTableFeatures, TData, TValue>;
export type Table<TData extends RowData> = TanstackTable<
  HubTableFeatures,
  TData
>;
/**
 * What `useTable` returns: a new object whenever the table's state changes,
 * with that state on `table.state`. Read state for rendering from here.
 */
export type ReactTable<TData extends RowData> = TanstackReactTable<
  HubTableFeatures,
  TData
>;
export type Row<TData extends RowData> = TanstackRow<HubTableFeatures, TData>;
export type Cell<TData extends RowData, TValue = unknown> = TanstackCell<
  HubTableFeatures,
  TData,
  TValue
>;
export type Column<TData extends RowData, TValue = unknown> = TanstackColumn<
  HubTableFeatures,
  TData,
  TValue
>;
export type Header<TData extends RowData, TValue = unknown> = TanstackHeader<
  HubTableFeatures,
  TData,
  TValue
>;
export type HeaderContext<
  TData extends RowData,
  TValue = unknown,
> = TanstackHeaderContext<HubTableFeatures, TData, TValue>;
