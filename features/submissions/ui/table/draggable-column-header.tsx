"use client";

import { Submission } from "@/lib/endatix-api";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Column, Header, flexRender } from "@tanstack/react-table";
import { GripVertical } from "lucide-react";

interface DraggableColumnHeaderProps<TData extends Submission> {
  column: Column<TData>;
  header: Header<TData, unknown>;
}

export function DraggableColumnHeader<TData extends Submission>({
  column,
  header,
}: DraggableColumnHeaderProps<TData>) {
  const isActionsColumn = column.id === "actions";

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
      className="flex items-center gap-1"
    >
      {/* Drag handle - hide for actions column */}
      {!isActionsColumn && (
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Original column header content */}
      {flexRender(header.column.columnDef.header, header.getContext())}
    </div>
  );
}
