import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Submission } from "@/lib/endatix-api";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  RowSelectionState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TablePagination } from "./table-pagination";

const ROW_CLASS_NAMES = {
  selected: "bg-accent",
  complete: "font-medium",
} as const;

const getRowClassName = (row: Row<Submission>) => {
  let className = "";
  if (row.getIsSelected()) {
    className += ROW_CLASS_NAMES.selected;
  }
  const submission = row.original;
  if (submission.isComplete) {
    className += ROW_CLASS_NAMES.complete;
  }
  return className || undefined;
};

export function DataTable({
  data,
  columns,
}: {
  data: Submission[];
  columns: ColumnDef<Submission>[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const router = useRouter();
  const handleRowSelectionChange = (row: Row<Submission>) => {
    table.setRowSelection({
      [row.id]: true,
    });
    //setIsSheetOpen(true)
    const submission = row.original as Submission;
    router.push(`/forms/${submission.formId}/submissions/${submission.id}`, {
      scroll: false,
    });
  };
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualFiltering: true,
    enableRowSelection: true,
    enableMultiRowSelection: false,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
  });

  return (
    <>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={getRowClassName(row)}
                onClick={() => handleRowSelectionChange(row)}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <TablePagination table={table} />
      <Sheet modal={true} open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[600px] sm:w-[480px] sm:max-w-none flex flex-col h-screen justify-between">
          <SheetHeader>
            <SheetTitle>Submission Details</SheetTitle>
            <SheetDescription>
              Here are the details of the selected item.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)] mt-4 p-4 rounded-md border">
            <pre>
              {JSON.stringify(
                table.getSelectedRowModel().rows.map((row) => row.original),
                null,
                2,
              )}
            </pre>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
