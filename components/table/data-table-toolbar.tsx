"use client";

import { ListFilter, MoreHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResponsivePanel,
  ResponsivePanelBody,
  ResponsivePanelDescription,
  ResponsivePanelFooter,
  ResponsivePanelHeader,
  ResponsivePanelTitle,
} from "@/components/ui/responsive-panel";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/utils/hooks/use-media-query.hook";
import { FiltersDrawerScope } from "./data-table-filter";
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
export function DataTableToolbar({
  search,
  filters,
  activeFilterCount = 0,
  filtersDisabled = false,
  reset,
  actions,
  collapsibleActions,
  moreActions,
  className,
}: Readonly<DataTableToolbarProps>) {
  return (
    <div
      data-slot="data-table-toolbar"
      className={cn(
        "group/toolbar flex flex-wrap items-center gap-2 md:flex-nowrap",
        className,
      )}
    >
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
        {reset ? (
          <ToolbarReset reset={reset} className="max-md:order-2" />
        ) : null}
      </div>
      {filters ? (
        <FiltersDrawer
          activeCount={activeFilterCount}
          disabled={filtersDisabled}
          reset={reset}
        >
          {filters}
        </FiltersDrawer>
      ) : null}
      <ToolbarActions
        actions={actions}
        collapsibleActions={collapsibleActions}
        moreActions={moreActions}
      />
    </div>
  );
}

/** Sticks to the end of the scrolling row, so a long filter row never hides it. */
function ToolbarReset({
  reset,
  className,
}: Readonly<{ reset: ResetFiltersButtonProps; className?: string }>) {
  return (
    <div
      data-slot="data-table-toolbar-reset"
      className={cn(
        "flex shrink-0 empty:hidden md:sticky md:right-0 md:bg-background",
        className,
      )}
    >
      <ResetFiltersButton {...reset} />
    </div>
  );
}

type FiltersDrawerProps = {
  activeCount: number;
  disabled: boolean;
  reset?: ResetFiltersButtonProps;
  children: ReactNode;
};

/** Below 768 px every filter moves into one drawer, each under its own label. */
function FiltersDrawer({
  activeCount,
  disabled,
  reset,
  children,
}: Readonly<FiltersDrawerProps>) {
  const [open, setOpen] = useState(false);
  const label = activeCount > 0 ? `Filters · ${activeCount}` : "Filters";
  const trigger = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      className={cn(
        "max-md:order-1 md:hidden",
        // A filter that renders nothing (a facet with no options yet) leaves no Filters button.
        "group-has-[[data-slot=data-table-toolbar-inline-filters]:empty]/toolbar:hidden",
      )}
    >
      <ListFilter />
      {label}
    </Button>
  );
  return (
    <ResponsivePanel
      open={open}
      onOpenChange={setOpen}
      desktopType="simple"
      drawerContentClassName="h-auto"
      trigger={trigger}
    >
      <ResponsivePanelHeader>
        <ResponsivePanelTitle>Filters</ResponsivePanelTitle>
        <ResponsivePanelDescription>
          Choose which rows the list shows. It updates as you choose.
        </ResponsivePanelDescription>
      </ResponsivePanelHeader>
      <ResponsivePanelBody>
        <FiltersDrawerScope>{children}</FiltersDrawerScope>
      </ResponsivePanelBody>
      <ResponsivePanelFooter>
        {reset?.onClick ? (
          <Button
            type="button"
            variant="outline"
            onClick={reset.onClick}
            disabled={reset.disabled || reset.hasFilters === false}
          >
            Reset
          </Button>
        ) : null}
        <Button type="button" onClick={() => setOpen(false)}>
          Done
        </Button>
      </ResponsivePanelFooter>
    </ResponsivePanel>
  );
}

type ToolbarActionsProps = Pick<
  DataTableToolbarProps,
  "actions" | "collapsibleActions" | "moreActions"
>;

function ToolbarActions({
  actions,
  collapsibleActions,
  moreActions,
}: Readonly<ToolbarActionsProps>) {
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

type MoreActionsMenuProps = {
  collapsedItems?: ReactNode;
  moreActions?: ReactNode;
};

/**
 * Non-modal, so an `AlertDialog` opened from an item (rendered beside the toolbar,
 * DESIGN.md §5 Overlays rule 10) gets the page's pointer events back.
 */
function MoreActionsMenu({
  collapsedItems,
  moreActions,
}: Readonly<MoreActionsMenuProps>) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="More actions"
          className={cn(!moreActions && "md:hidden")}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <MoreActionsItems
          collapsedItems={collapsedItems}
          moreActions={moreActions}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Mounted only while the menu is open, so the width is known by then. */
function MoreActionsItems({
  collapsedItems,
  moreActions,
}: Readonly<MoreActionsMenuProps>) {
  const isMobile = useIsMobile();
  const showCollapsed = Boolean(collapsedItems) && isMobile;
  return (
    <>
      {showCollapsed ? collapsedItems : null}
      {showCollapsed && moreActions ? <DropdownMenuSeparator /> : null}
      {moreActions}
    </>
  );
}
