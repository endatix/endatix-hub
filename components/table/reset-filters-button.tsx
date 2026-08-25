"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type ResetFiltersButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

/**
 * "Reset Filters" action for a `DataTableToolbar`. Pair with the caller's own
 * active-filters check (e.g. only render when a filter is set) and pass a
 * handler that clears search/filter URL params and resets `page`. Sized to
 * match `FacetedFilter`'s trigger (`size="sm"`) and collapses to icon-only
 * below `sm` to save toolbar space, with the label kept for screen readers.
 */
export function ResetFiltersButton({
  onClick,
  disabled = false,
  className,
}: Readonly<ResetFiltersButtonProps>) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      aria-label="Reset Filters"
      className={cn("shrink-0 px-2 lg:px-3", className)}
    >
      <X />
      <span className="sr-only sm:not-sr-only">Reset Filters</span>
    </Button>
  );
}
