"use client";

import type { Header } from "@tanstack/react-table";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";

/** Narrowest a column can be dragged to, unless its `minSize` says more. */
const DEFAULT_MIN_COLUMN_WIDTH = 48;
const KEYBOARD_STEP = 16;
const HANDLE_CLASS_NAME =
  "absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none hover:bg-primary/40 focus-visible:bg-primary/60 focus-visible:outline-none";

/**
 * Inline width for a header the user resized; `undefined` leaves the column
 * to the table's automatic layout.
 */
export function resizedHeaderStyle<TData>(
  header: Header<TData, unknown>,
): CSSProperties | undefined {
  const sizing = header.getContext().table.getState().columnSizing;
  if (!(header.column.id in sizing)) {
    return undefined;
  }

  const width = header.column.getSize();
  return { width, minWidth: width };
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

  const resize = (width: number) => setColumnWidth(header, width);
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      tabIndex={0}
      onPointerDown={(event) => startDrag(event, resize)}
      onKeyDown={(event) => resizeByKey(event, header, resize)}
      onDoubleClick={() => clearColumnWidth(header)}
      className={HANDLE_CLASS_NAME}
    />
  );
}

function startDrag(
  event: PointerEvent<HTMLDivElement>,
  resize: (width: number) => void,
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
    resize(startWidth + move.clientX - startX),
  );
}

/** Calls `onMove` until the captured pointer is released. */
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
  event: KeyboardEvent<HTMLDivElement>,
  header: Header<TData, unknown>,
  resize: (width: number) => void,
) {
  const step = { ArrowLeft: -KEYBOARD_STEP, ArrowRight: KEYBOARD_STEP }[
    event.key
  ];
  const cell = event.currentTarget.parentElement;
  if (step === undefined || !cell) {
    return;
  }

  event.preventDefault();
  const current =
    header.column.id in header.getContext().table.getState().columnSizing
      ? header.column.getSize()
      : cell.getBoundingClientRect().width;
  resize(current + step);
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
