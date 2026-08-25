import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Shared list-table chrome used by submissions and data-list tables. */
export const DATA_TABLE_SURFACE_CLASS_NAME =
  "rounded-xl border border-border/40 bg-surface-container-lowest shadow-[0_8px_30px_rgb(0,52,94,0.04)] backdrop-blur-xl dark:shadow-none";

interface DataTableSurfaceProps extends ComponentProps<"div"> {
  /** Dims rows during URL filter/sort/page transitions. */
  isPending?: boolean;
}

export function DataTableSurface({
  className,
  isPending = false,
  children,
  ...props
}: Readonly<DataTableSurfaceProps>) {
  return (
    <div
      className={cn(
        DATA_TABLE_SURFACE_CLASS_NAME,
        "transition-opacity duration-150",
        isPending && "pointer-events-none opacity-60",
        className,
      )}
      aria-busy={isPending || undefined}
      {...props}
    >
      {children}
    </div>
  );
}
