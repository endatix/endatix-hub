import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Shared list-table chrome used by submissions and data-list tables. */
export const DATA_TABLE_SURFACE_CLASS_NAME =
  "rounded-xl border border-border/40 bg-surface-container-lowest shadow-[0_8px_30px_rgb(0,52,94,0.04)] backdrop-blur-xl dark:shadow-none";

export function DataTableSurface({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(DATA_TABLE_SURFACE_CLASS_NAME, className)}
      {...props}
    >
      {children}
    </div>
  );
}
