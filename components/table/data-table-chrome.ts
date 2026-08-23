import { cn } from "@/lib/utils";

/** Uppercase muted column title used by submissions and data-list grids. */
export const DATA_TABLE_COLUMN_LABEL_CLASS_NAME =
  "truncate text-xs font-semibold tracking-wider text-muted-foreground uppercase";

/** Shared `<table>` layout: fill the surface; min-widths keep columns readable while leftover width is shared. */
export const DATA_TABLE_ELEMENT_CLASS_NAME =
  "w-full min-w-full border-separate border-spacing-0";

/** Keep a column at content width. Do not use `w-[1%]` — with `table-fixed` it collapses cells. */
export const DATA_TABLE_SHRINK_WRAP_CLASS_NAME = "whitespace-nowrap";

export function dataTableColumnLabelClassName(className?: string): string {
  return cn(DATA_TABLE_COLUMN_LABEL_CLASS_NAME, className);
}

export function dataTableHeaderCellClassName(options: {
  isPinnedLeft?: boolean;
  className?: string;
}): string {
  return cn(
    "sticky top-0 h-10 bg-surface-container-low px-2 shadow-[inset_0_-1px_0_0] shadow-border/30",
    options.isPinnedLeft ? "left-0 z-30" : "z-10",
    options.className,
  );
}

export function dataTableBodyRowClassName(options: {
  isEvenRow: boolean;
  className?: string;
}): string {
  return cn(
    "group border-0",
    dataTableZebraRowFillClassName(options.isEvenRow),
    options.className,
  );
}

export function dataTableBodyCellClassName(options: {
  isPinnedLeft?: boolean;
  isEvenRow: boolean;
  isSelected?: boolean;
  className?: string;
}): string {
  const isPinnedLeft = options.isPinnedLeft === true;

  return cn(
    "px-2 py-2",
    isPinnedLeft && "sticky left-0 z-20 transition-colors duration-150",
    isPinnedLeft &&
      dataTablePinnedCellFillClassName({
        isEvenRow: options.isEvenRow,
        isSelected: options.isSelected === true,
      }),
    options.className,
  );
}

function dataTableZebraRowFillClassName(isEvenRow: boolean): string {
  if (isEvenRow) {
    return "bg-surface-container-low hover:bg-surface-container";
  }

  return "bg-surface-container-lowest hover:bg-surface-container";
}

function dataTablePinnedCellFillClassName(options: {
  isEvenRow: boolean;
  isSelected: boolean;
}): string {
  if (options.isSelected) {
    return "bg-accent group-hover:bg-accent";
  }

  if (options.isEvenRow) {
    return "bg-surface-container-low group-hover:bg-surface-container";
  }

  return "bg-surface-container-lowest group-hover:bg-surface-container";
}
