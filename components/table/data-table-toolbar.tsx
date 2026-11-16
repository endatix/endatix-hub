"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FiltersDrawer } from "./data-table-filters-drawer";
import { MoreActionsMenu } from "./data-table-more-actions";
import {
  ResetFiltersButton,
  type ResetFiltersButtonProps,
} from "./reset-filters-button";

/** An action shown in the row from 768 px, and as menu items in `⋯` below it. */
export type DataTableToolbarCollapsibleActions = {
  inline: ReactNode;
  menuItems: ReactNode;
};

type DataTableToolbarProps = {
  /** The search box. In the row at every width; its own line below 768 px. */
  search?: ReactNode;
  /** `FacetedFilter`s and `DataTableFilter`s: in the row from 768 px, in the Filters drawer below. */
  filters?: ReactNode;
  /** How many of `filters` have a selection, shown as "Filters · n". */
  activeFilterCount?: number;
  filtersDisabled?: boolean;
  /** Reset in the row; its `onClick` is also the drawer's Reset. */
  reset?: ResetFiltersButtonProps;
  /** Pinned at every width (Export, the list's create action). */
  actions?: ReactNode;
  collapsibleActions?: DataTableToolbarCollapsibleActions;
  /** Occasional actions: `DropdownMenuItem`s in `⋯` at every width. */
  moreActions?: ReactNode;
  className?: string;
};

const SCROLL_CLASS_NAME =
  "md:overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

/**
 * One list toolbar for every table (DESIGN.md §5 List tables). From 768 px: search and filters
 * scroll in one row, Reset stays in view at its end, actions are pinned right. Below 768 px:
 * search on its own line, then Filters (a drawer), Reset, actions and `⋯`, never off screen.
 */
export function DataTableToolbar(props: Readonly<DataTableToolbarProps>) {
  const { filters, activeFilterCount = 0, filtersDisabled = false } = props;
  return (
    <div
      data-slot="data-table-toolbar"
      className={cn(
        "group/toolbar flex flex-wrap items-center gap-2 md:flex-nowrap",
        props.className,
      )}
    >
      <ToolbarFilters {...props} />
      {filters ? (
        <FiltersDrawer
          activeCount={activeFilterCount}
          disabled={filtersDisabled}
          reset={props.reset}
        >
          {filters}
        </FiltersDrawer>
      ) : null}
      <ToolbarActions {...props} />
    </div>
  );
}

/**
 * From 768 px: search, the filters and Reset in one scrolling row. Below: `contents`, so search
 * takes its own line, the filters hide (they are in the drawer) and Reset joins the row.
 */
function ToolbarFilters({
  search,
  filters,
  reset,
}: Readonly<DataTableToolbarProps>) {
  return (
    <div
      data-slot="data-table-toolbar-filters"
      className={cn(
        "contents md:flex md:min-w-0 md:flex-1 md:items-center md:gap-2",
        SCROLL_CLASS_NAME,
      )}
    >
      {search ? (
        <div
          data-slot="data-table-toolbar-search"
          className="flex min-w-0 basis-full md:contents"
        >
          {search}
        </div>
      ) : null}
      {filters ? (
        <div
          data-slot="data-table-toolbar-inline-filters"
          className="hidden md:contents"
        >
          {filters}
        </div>
      ) : null}
      {reset ? <ToolbarReset reset={reset} /> : null}
    </div>
  );
}

/** Sticks to the end of the scrolling row, so a long filter row never hides it. */
function ToolbarReset({ reset }: Readonly<{ reset: ResetFiltersButtonProps }>) {
  return (
    <div
      data-slot="data-table-toolbar-reset"
      className="flex shrink-0 empty:hidden max-md:order-2 md:sticky md:right-0 md:bg-background"
    >
      <ResetFiltersButton {...reset} />
    </div>
  );
}

function ToolbarActions({
  actions,
  collapsibleActions,
  moreActions,
}: Readonly<DataTableToolbarProps>) {
  if (!actions && !collapsibleActions && !moreActions) {
    return null;
  }
  return (
    <div
      data-slot="data-table-toolbar-actions"
      className="ml-auto flex shrink-0 items-center gap-2 max-md:order-3"
    >
      {collapsibleActions ? (
        <div className="hidden md:contents">{collapsibleActions.inline}</div>
      ) : null}
      {actions}
      {collapsibleActions || moreActions ? (
        <MoreActionsMenu
          collapsedItems={collapsibleActions?.menuItems}
          moreActions={moreActions}
        />
      ) : null}
    </div>
  );
}
