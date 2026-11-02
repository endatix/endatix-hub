import "@tanstack/react-table";
import "@/components/table/data-table-column-meta";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- an augmentation must repeat the declaration's type parameters.
  interface ColumnMeta<TData, TValue> {
    displayName?: string;
    defaultHidden?: boolean;
  }
}
