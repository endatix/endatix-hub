"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";

type ResetFiltersButtonProps = {
  /**
   * Clears filters only. Kept as the primary callback so existing toolbars
   * (`onClick={onResetFilters}`) keep working.
   */
  onClick?: () => void;
  onResetSorting?: () => void;
  /** Single update when both filters and sorting are cleared (avoids two URL writes). */
  onResetAll?: () => void;
  /** When set with `onResetSorting`, drives which reset actions appear. */
  hasFilters?: boolean;
  hasSorting?: boolean;
  disabled?: boolean;
  className?: string;
};

const resetButtonClassName = "shrink-0 px-2 lg:px-3";

/**
 * Toolbar reset for list grids. One action → a single ghost button.
 * Filters + sorting → dropdown (reset filters, sorting, or both), matching
 * the submissions reset-options pattern without a second control.
 */
export function ResetFiltersButton({
  onClick,
  onResetSorting,
  onResetAll,
  hasFilters,
  hasSorting,
  disabled = false,
  className,
}: Readonly<ResetFiltersButtonProps>) {
  const resetFilters = onClick;
  const showFilters = hasFilters ?? Boolean(resetFilters);
  const showSorting = Boolean(hasSorting && onResetSorting);

  if (!showFilters && !showSorting) {
    return null;
  }

  if (showFilters && showSorting && resetFilters && onResetSorting) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-label="Reset filters and sorting"
            className={cn(resetButtonClassName, className)}
          >
            <X />
            <span className="sr-only sm:not-sr-only">Reset</span>
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[12.5rem]">
          <DropdownMenuItem onClick={resetFilters} disabled={disabled}>
            Reset Filters
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onResetSorting} disabled={disabled}>
            Reset Sorting
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              if (onResetAll) {
                onResetAll();
                return;
              }
              resetFilters();
              onResetSorting();
            }}
            disabled={disabled}
          >
            Reset All
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (showSorting && onResetSorting) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onResetSorting}
        disabled={disabled}
        aria-label="Reset Sorting"
        className={cn(resetButtonClassName, className)}
      >
        <X />
        <span className="sr-only sm:not-sr-only">Reset Sorting</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={resetFilters}
      disabled={disabled}
      aria-label="Reset Filters"
      className={cn(resetButtonClassName, className)}
    >
      <X />
      <span className="sr-only sm:not-sr-only">Reset Filters</span>
    </Button>
  );
}
