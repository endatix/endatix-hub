import "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    displayName?: string;
    defaultHidden?: boolean;
    /** Applied to `<th>` — use `w-[1%]` to shrink-wrap content. */
    headerClassName?: string;
    /** Applied to `<td>` — use `w-[1%]` to shrink-wrap content. */
    cellClassName?: string;
  }
}
