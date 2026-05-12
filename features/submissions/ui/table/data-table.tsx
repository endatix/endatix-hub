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
import { NoMatchingSubmissionsEmptyState } from "@/features/submissions/ui/submissions-empty-state";
import { Submission } from "@/lib/endatix-api";
import { cn } from "@/lib/utils";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  type Modifier,
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
  PaginationState,
  Row,
  RowSelectionState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useId, useState } from "react";
import { useColumnOrder } from "./column-order-context";
import { useColumnVisibility } from "./column-visibility-context";
import { DraggableColumnHeader } from "./draggable-column-header";
import { TablePagination } from "./table-pagination";

const ROW_CLASS_NAMES = {
  selected: "bg-accent",
  complete: "font-medium",
} as const;

const getActivatorCoordinates = (
  event: Event | null,
): { x: number; y: number } | null => {
  if (!event) {
    return null;
  }

  if ("clientX" in event && "clientY" in event) {
    const pointerEvent = event as MouseEvent | PointerEvent;
    return {
      x: pointerEvent.clientX,
      y: pointerEvent.clientY,
    };
  }

  if ("touches" in event) {
    const touchEvent = event as TouchEvent;
    const touch = touchEvent.touches[0] ?? touchEvent.changedTouches[0];
    if (touch) {
      return {
        x: touch.clientX,
        y: touch.clientY,
      };
    }
  }

  return null;
};

const centerDragOverlayOnPointer: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  overlayNodeRect,
  transform,
}) => {
  const coordinates = getActivatorCoordinates(activatorEvent);
  const overlayRect = overlayNodeRect ?? draggingNodeRect;

  if (!coordinates || !draggingNodeRect || !overlayRect) {
    return transform;
  }

  return {
    ...transform,
    x:
      transform.x +
      coordinates.x -
      draggingNodeRect.left -
      overlayRect.width / 2,
    y:
      transform.y +
      coordinates.y -
      draggingNodeRect.top -
      overlayRect.height / 2,
  };
};

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
  pagination: externalPagination,
  onPaginationChange: externalOnPaginationChange,
  rowCount,
  pageCount,
  onFilteredEmptyClear,
}: {
  data: TData[];
  columns: ColumnDef<TData>[];
  formId: string;
  sorting?: SortingState;
  onSortingChange?: Dispatch<SetStateAction<SortingState>>;
  pagination?: PaginationState;
  onPaginationChange?: Dispatch<SetStateAction<PaginationState>>;
  rowCount?: number;
  pageCount?: number;
  onFilteredEmptyClear?: () => void;
}) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);

  const sorting = externalSorting ?? internalSorting;
  const setSorting = externalOnSortingChange ?? setInternalSorting;
  const manualPagination = externalPagination !== undefined;
  const manualRowCount = manualPagination ? rowCount : undefined;
  const manualPageCount = manualPagination ? pageCount : undefined;
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  const dndContextId = useId();
  const router = useRouter();
  const { columnOrder, reorderColumn } = useColumnOrder();
  const { columnVisibility } = useColumnVisibility();
  const visibleColumnOrder = columnOrder.filter(
    (id) => id !== "actions" && columnVisibility[id] !== false,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Prevent accidental drags
      },
    }),
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
    manualPagination,
    rowCount: manualRowCount,
    pageCount: manualPageCount,
    enableRowSelection: true,
    enableMultiRowSelection: false,
    enableColumnPinning: true,
    onSortingChange: setSorting,
    onPaginationChange: manualPagination
      ? externalOnPaginationChange
      : undefined,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
      ...(externalPagination ? { pagination: externalPagination } : {}),
      columnOrder,
      columnVisibility,
      columnPinning: {
        left: ["actions"],
      },
    },
  });

  const rows = table.getRowModel().rows;

  if (rows.length === 0) {
    const isFilteredEmpty =
      manualRowCount !== undefined &&
      manualRowCount > 0 &&
      onFilteredEmptyClear !== undefined;

    return (
      <div
        data-slot="submission-data-table"
        className="rounded-xl border border-sidebar-border/70 bg-background/90 shadow-[0_8px_30px_rgb(0,52,94,0.04)] backdrop-blur-xl dark:shadow-none"
      >
        {isFilteredEmpty ? (
          <NoMatchingSubmissionsEmptyState
            onClearFilters={onFilteredEmptyClear}
          />
        ) : (
          <div className="flex h-24 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            No rows to display.
          </div>
        )}
        {manualRowCount && manualRowCount > 0 ? (
          <TablePagination table={table} totalRows={manualRowCount} />
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div
        data-slot="submission-data-table"
        className="rounded-xl border border-sidebar-border/70 bg-background/90 shadow-[0_8px_30px_rgb(0,52,94,0.04)] backdrop-blur-xl dark:shadow-none"
      >
        <DndContext
          id={dndContextId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Table className="border-separate border-spacing-0">
            <TableHeader className="border-b border-sidebar-border/50 bg-muted">
              <SortableContext
                items={visibleColumnOrder}
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
                            "sticky top-0 h-14 bg-muted shadow-[inset_0_-1px_0_0] shadow-border/40",
                            isPinned === "left" ? "left-0 z-30" : "z-10",
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
              {rows.map((row) => {
                return (
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
                            isPinned === "left" && "left-0",
                            isPinned &&
                              row.getIsSelected() &&
                              "bg-accent group-hover:bg-accent",
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <DragOverlay
            dropAnimation={null}
            modifiers={[centerDragOverlayOnPointer]}
          >
            {activeColumn ? (
              <div className="pointer-events-none cursor-pointer rounded-md border border-sidebar-border/70 bg-background px-2 py-1 opacity-95 shadow-lg">
                {(() => {
                  const column = table
                    .getAllColumns()
                    .find((col) => col.id === activeColumn);
                  const header = table
                    .getHeaderGroups()[0]
                    ?.headers.find((h) => h.column.id === activeColumn);

                  if (column?.columnDef.header && header) {
                    return flexRender(
                      column.columnDef.header,
                      header.getContext(),
                    );
                  }
                  return null;
                })()}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        <TablePagination
          table={table}
          totalRows={rowCount ?? table.getFilteredRowModel().rows.length}
        />
      </div>
      <Sheet modal={true} open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="flex h-screen w-[600px] flex-col justify-between sm:w-[480px] sm:max-w-none">
          <SheetHeader>
            <SheetTitle>Submission Details</SheetTitle>
            <SheetDescription>
              Here are the details of the selected item.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="mt-4 h-[calc(100vh-8rem)] rounded-md border p-4">
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
