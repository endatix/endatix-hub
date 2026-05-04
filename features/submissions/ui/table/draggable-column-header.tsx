"use client";

import { Submission } from "@/lib/endatix-api";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Column, Header, flexRender } from "@tanstack/react-table";

interface DraggableColumnHeaderProps<TData extends Submission> {
  column: Column<TData>;
  header: Header<TData, unknown>;
}

export function DraggableColumnHeader<TData extends Submission>({
  column,
  header,
}: DraggableColumnHeaderProps<TData>) {
  const isActionsColumn = column.id === "actions";
  const canSort = column.getCanSort();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    disabled: isActionsColumn,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "[&_*]:!cursor-inherit flex touch-none items-center gap-1",
        canSort ? "!cursor-pointer" : "!cursor-default",
      )}
      {...(!isActionsColumn ? attributes : {})}
      {...(!isActionsColumn ? listeners : {})}
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
    </div>
  );
}
