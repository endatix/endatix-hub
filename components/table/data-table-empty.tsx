import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

interface DataTableEmptyProps {
  /** Without `title`: the one-line message. With `title`: the description under it. */
  children?: ReactNode;
  className?: string;
  /** The list's entity icon — the same glyph as its sidebar item. Both states use it. */
  icon?: LucideIcon;
  /** Turns the one-liner into the titled empty state (`DESIGN.md` §5 List Tables). */
  title?: ReactNode;
  /** A way out of a filtered-empty list; renders the standard "Clear filters" button. */
  onClearFilters?: () => void;
  /** Any other next step, e.g. the list's create button. Rendered after "Clear filters". */
  action?: ReactNode;
}

export function DataTableEmpty({
  children,
  className,
  icon: Icon,
  title,
  onClearFilters,
  action,
}: Readonly<DataTableEmptyProps>) {
  if (!title) {
    return (
      <div
        className={cn(
          "flex h-24 items-center justify-center px-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  const hasActions = Boolean(onClearFilters || action);

  return (
    // Inside a surface, under a column header: compact, not the page-level `md:p-12`.
    <Empty
      data-slot="data-table-empty"
      className={cn("gap-4 px-6 py-10 md:p-10", className)}
    >
      <EmptyHeader>
        {Icon && (
          <EmptyMedia variant="icon">
            <Icon aria-hidden="true" />
          </EmptyMedia>
        )}
        <EmptyTitle className="text-base">{title}</EmptyTitle>
        {children && <EmptyDescription>{children}</EmptyDescription>}
      </EmptyHeader>
      {hasActions && (
        <EmptyContent className="flex-row flex-wrap justify-center gap-2">
          {onClearFilters && (
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              Clear filters
            </Button>
          )}
          {action}
        </EmptyContent>
      )}
    </Empty>
  );
}
