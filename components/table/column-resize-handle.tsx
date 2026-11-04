"use client";

import type { Column, Header, Table } from "@tanstack/react-table";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";

const DEFAULT_MIN_COLUMN_WIDTH = 48;
const KEYBOARD_STEP = 16;
const HANDLE_CLASS_NAME =
  "absolute top-0 right-0 h-full w-1.5 cursor-col-resize border-0 bg-transparent p-0 touch-none select-none hover:bg-primary/40 focus-visible:bg-primary/60 focus-visible:outline-none";

/**
 * Inline width for the header and cells of a column the user resized, on a
 * table that opts in; `undefined` leaves the column to the automatic layout.
 * Cells need it too: their `min-w-*` classes would otherwise hold the column
 * wider than the width that is saved.
 */
export function resizedColumnStyle<TData>(
  table: Table<TData>,
  column: Column<TData, unknown>,
): CSSProperties | undefined {
  const isResized =
    table.options.enableColumnResizing === true &&
    column.id in table.getState().columnSizing;
  if (!isResized) {
    return undefined;
  }

  const width = column.getSize();
  return { width, minWidth: width, maxWidth: width };
}

/**
 * Drag (or arrow keys) to resize a column; double-click returns it to the
 * automatic width. Starts from the width the header has on screen, so a
 * column never jumps when the drag begins.
 */
export function ColumnResizeHandle<TData>({
  header,
}: Readonly<{ header: Header<TData, unknown> }>) {
  if (!header.column.getCanResize()) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Resize column (arrow keys; double-click resets)"
      onPointerDown={(event) => startDrag(event, header)}
      onKeyDown={(event) => resizeByKey(event, header)}
      onDoubleClick={() => clearColumnWidth(header)}
      className={HANDLE_CLASS_NAME}
    />
  );
}

function startDrag<TData>(
  event: PointerEvent<HTMLButtonElement>,
  header: Header<TData, unknown>,
) {
  const cell = event.currentTarget.parentElement;
  if (!cell) {
    return;
  }

  event.preventDefault();
  const startX = event.clientX;
  const startWidth = cell.getBoundingClientRect().width;
  event.currentTarget.setPointerCapture(event.pointerId);
  followPointer(event.currentTarget, (move) =>
    setColumnWidth(header, startWidth + move.clientX - startX),
  );
}

function followPointer(
  handle: HTMLElement,
  onMove: (event: globalThis.PointerEvent) => void,
) {
  const onEnd = () => {
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onEnd);
    handle.removeEventListener("pointercancel", onEnd);
  };
  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", onEnd);
  handle.addEventListener("pointercancel", onEnd);
}

function resizeByKey<TData>(
  event: KeyboardEvent<HTMLButtonElement>,
  header: Header<TData, unknown>,
) {
  const step = { ArrowLeft: -KEYBOARD_STEP, ArrowRight: KEYBOARD_STEP }[
    event.key
  ];
  const cell = event.currentTarget.parentElement;
  if (step === undefined || !cell) {
    return;
  }

  event.preventDefault();
  setColumnWidth(header, cell.getBoundingClientRect().width + step);
}

function setColumnWidth<TData>(header: Header<TData, unknown>, width: number) {
  const { minSize, maxSize } = header.column.columnDef;
  const clamped = Math.round(
    Math.min(
      maxSize ?? Number.MAX_SAFE_INTEGER,
      Math.max(minSize ?? 0, DEFAULT_MIN_COLUMN_WIDTH, width),
    ),
  );
  header.getContext().table.setColumnSizing((sizing) => ({
    ...sizing,
    [header.column.id]: clamped,
  }));
}

function clearColumnWidth<TData>(header: Header<TData, unknown>) {
  header.getContext().table.setColumnSizing((sizing) => {
    const { [header.column.id]: _cleared, ...rest } = sizing;
    return rest;
  });
}
