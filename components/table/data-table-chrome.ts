import { cn } from "@/lib/utils";

/** Uppercase muted column title used by submissions and data-list grids. */
export const DATA_TABLE_COLUMN_LABEL_CLASS_NAME =
  "truncate text-xs font-semibold tracking-wider text-muted-foreground uppercase";

/** Shared `<table>` layout: min-w-full fills the surface; column min-widths keep cells readable while leftover width is shared. */
export const DATA_TABLE_ELEMENT_CLASS_NAME =
  "min-w-full border-separate border-spacing-0";

/** Shrink a column to its content (`w-px`); pair with `min-w-*` when a floor is needed. */
export const DATA_TABLE_SHRINK_WRAP_CLASS_NAME = "w-px";

export function dataTableColumnLabelClassName(className?: string): string {
  return cn(DATA_TABLE_COLUMN_LABEL_CLASS_NAME, className);
}

export function dataTableHeaderCellClassName(options: {
  isPinnedLeft?: boolean;
  /** Omit sticky stacking — for skeletons and other non-interactive headers. */
  isStatic?: boolean;
  className?: string;
}): string {
  const isStatic = options.isStatic === true;
  const stickyClass = isStatic ? undefined : "sticky top-0";
  let stackingClass: string | undefined;
  if (!isStatic) {
    stackingClass = options.isPinnedLeft ? "left-0 z-30" : "z-10";
  }

  return cn(
    "h-10 bg-surface-container-low px-2 shadow-[inset_0_-1px_0_0] shadow-border/30",
    stickyClass,
    stackingClass,
    options.className,
  );
}

export function dataTableBodyRowClassName(options: {
  isEvenRow: boolean;
  /** Omit hover/group chrome — for skeletons and other non-interactive rows. */
  isStatic?: boolean;
  className?: string;
}): string {
  const isStatic = options.isStatic === true;

  return cn(
    "border-0",
    !isStatic && "group",
    dataTableZebraRowFillClassName(options.isEvenRow, isStatic),
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

function dataTableZebraRowFillClassName(
  isEvenRow: boolean,
  isStatic: boolean,
): string {
  if (isEvenRow) {
    return isStatic
      ? "bg-surface-container-low"
      : "bg-surface-container-low hover:bg-surface-container";
  }

  return isStatic
    ? "bg-surface-container-lowest"
    : "bg-surface-container-lowest hover:bg-surface-container";
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
