import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    displayName?: string;
    defaultHidden?: boolean;
    /** Applied to `<th>` — min-width classes; leftover table width is shared. */
    headerClassName?: string;
    /** Applied to `<td>` — min-width classes; leftover table width is shared. */
    cellClassName?: string;
  }
}
