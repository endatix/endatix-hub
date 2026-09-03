import "@tanstack/react-table";

/**
 * Column chrome shared by every Hub list table. Feature modules augment
 * `ColumnMeta` further with their own fields; class names live here so the
 * `DataTableGrid` contract has exactly one declaration.
 */
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    /** Applied to `<th>` — min-width classes; leftover table width is shared. */
    headerClassName?: string;
    /** Applied to `<td>` — min-width classes; leftover table width is shared. */
    cellClassName?: string;
  }
}
