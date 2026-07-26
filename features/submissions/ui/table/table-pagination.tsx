import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface TablePagination<TData> {
  readonly table: Table<TData>;
  readonly totalRows?: number;
}

export function TablePagination<TData>({
  table,
  totalRows,
}: TablePagination<TData>) {
  return (
    <div className="flex flex-col gap-3 border-t border-border/40 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex-1 text-sm text-muted-foreground">
        <span className="sm:hidden">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {totalRows ?? table.getCoreRowModel().rows.length} selected
        </span>
        <span className="hidden sm:inline">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {totalRows ?? table.getCoreRowModel().rows.length} row(s) selected.
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end sm:space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="hidden text-sm font-medium sm:block">Rows per page</p>
          <p className="text-sm font-medium sm:hidden">Rows</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-auto items-center justify-center text-sm font-medium sm:w-[100px]">
          <span className="sm:hidden">
            {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
          </span>
          <span className="hidden sm:inline">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
