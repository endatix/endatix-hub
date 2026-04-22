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
import { cn } from "@/lib/utils";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
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
import { Dispatch, SetStateAction, useState } from "react";
import { useColumnOrder } from "./column-order-context";
import { useColumnVisibility } from "./column-visibility-context";
import { DraggableColumnHeader } from "./draggable-column-header";
import { TablePagination } from "./table-pagination";

const ROW_CLASS_NAMES = {
  selected: "bg-accent",
  complete: "font-medium",
} as const;

const getRowClassName = <TData extends Submission>(row: Row<TData>) => {
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

export function DataTable<TData extends Submission>({
  data,
  columns,
  formId,
  sorting: externalSorting,
  onSortingChange: externalOnSortingChange,
}: {
  data: TData[];
  columns: ColumnDef<TData>[];
  formId: string;
  sorting?: SortingState;
  onSortingChange?: Dispatch<SetStateAction<SortingState>>;
}) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);

  const sorting = externalSorting !== undefined ? externalSorting : internalSorting;
  const setSorting = externalOnSortingChange !== undefined ? externalOnSortingChange : setInternalSorting;
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  const router = useRouter();
  const { columnOrder, reorderColumn } = useColumnOrder();
  const { columnVisibility } = useColumnVisibility();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Prevent accidental drags
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveColumn(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderColumn(active.id as string, over.id as string);
    }
    setActiveColumn(null);
  };
  const handleRowSelectionChange = (row: Row<TData>) => {
    table.setRowSelection({
      [row.id]: true,
    });
    //setIsSheetOpen(true)
    const submission = row.original;
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
    enableColumnPinning: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
      columnOrder,
      columnVisibility,
      columnPinning: {
        left: ['actions'],
      },
    },
  });

  const rows = table.getRowModel().rows;

  return (
    <>
      <div
        data-slot="submission-data-table"
        className="rounded-xl border border-sidebar-border/70 bg-background/90 shadow-[0_8px_30px_rgb(0,52,94,0.04)] backdrop-blur-xl dark:shadow-none"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Table className="border-separate border-spacing-0">
              <TableHeader className="bg-muted/70 border-b border-sidebar-border/50">
                <SortableContext
                  items={columnOrder.filter(id => id !== 'actions')}
                  strategy={horizontalListSortingStrategy}
                >
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        const isPinned = header.column.getIsPinned();
                        return (
                          <TableHead
                            key={header.id}
                            colSpan={header.colSpan}
                            className={cn(
                              "h-14 sticky top-0 bg-muted/70 shadow-[inset_0_-1px_0_0] shadow-border/40 backdrop-blur-sm",
                              isPinned === "left"
                                ? "left-0 z-30"
                                : "z-10",
                            )}
                          >
                            {header.isPlaceholder ? null : (
                              <DraggableColumnHeader
                                header={header}
                                column={header.column}
                              />
                            )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </SortableContext>
              </TableHeader>
              <TableBody>
                {rows.length > 0 ? (
                  rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn("group cursor-pointer", getRowClassName(row))}
                      onClick={() => handleRowSelectionChange(row)}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isPinned = cell.column.getIsPinned();
                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              isPinned &&
                                "sticky z-20 bg-background transition-colors duration-150 group-hover:bg-muted/50",
                              isPinned === 'left' && "left-0",
                              isPinned &&
                                row.getIsSelected() &&
                                "bg-accent group-hover:bg-accent"
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
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
          <DragOverlay>
            {activeColumn ? (
              <div className="px-4 py-2 cursor-grabbing opacity-60">
                {(() => {
                  const column = table.getAllColumns().find(col => col.id === activeColumn);
                  const header = table.getHeaderGroups()[0]?.headers.find(h => h.column.id === activeColumn);

                  if (column?.columnDef.header && header) {
                    return flexRender(column.columnDef.header, header.getContext());
                  }
                  return null;
                })()}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        <TablePagination table={table} />
      </div>
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
