import "@tanstack/react-table";
import "@/components/table/data-table-column-meta";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    displayName?: string;
    defaultHidden?: boolean;
  }
}
