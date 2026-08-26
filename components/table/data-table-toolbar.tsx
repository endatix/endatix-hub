"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DataTableToolbarProps = {
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Shows an "Updating…" cue during URL filter/sort/page transitions. */
  isPending?: boolean;
};

/**
 * One-row list toolbar: filters scroll horizontally, actions stay pinned.
 * Avoids stacking filter chips and View/Export on small viewports.
 */
export function DataTableToolbar({
  filters,
  actions,
  className,
  isPending = false,
}: Readonly<DataTableToolbarProps>) {
  return (
    <div
      data-slot="data-table-toolbar"
      className={cn("flex items-center gap-2", className)}
    >
      <div
        data-slot="data-table-toolbar-filters"
        className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {filters}
      </div>
      {actions || isPending ? (
        <div
          data-slot="data-table-toolbar-actions"
          className="flex shrink-0 items-center gap-2"
        >
          {isPending ? (
            <div
              role="status"
              aria-live="polite"
              className="hidden min-w-[5rem] text-right text-sm text-muted-foreground sm:block"
            >
              Updating…
            </div>
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
