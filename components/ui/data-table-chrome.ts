import { cn } from "@/lib/utils";

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
    options.isEvenRow
      ? "bg-surface-container-low hover:bg-surface-container"
      : "bg-surface-container-lowest hover:bg-surface-container",
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
  const isSelected = options.isSelected === true;

  return cn(
    "px-2 py-2",
    isPinnedLeft && "sticky left-0 z-20 transition-colors duration-150",
    isPinnedLeft && isSelected && "bg-accent group-hover:bg-accent",
    isPinnedLeft &&
      !isSelected &&
      (options.isEvenRow
        ? "bg-surface-container-low group-hover:bg-surface-container"
        : "bg-surface-container-lowest group-hover:bg-surface-container"),
    options.className,
  );
}
