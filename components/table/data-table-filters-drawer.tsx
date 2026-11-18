"use client";

import { ListFilter } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  ResponsivePanel,
  ResponsivePanelBody,
  ResponsivePanelDescription,
  ResponsivePanelFooter,
  ResponsivePanelHeader,
  ResponsivePanelTitle,
} from "@/components/ui/responsive-panel";
import { cn } from "@/lib/utils";
import { FiltersDrawerScope } from "./data-table-filter";
import type { ResetFiltersButtonProps } from "./reset-filters-button";

type FiltersDrawerProps = {
  activeCount: number;
  disabled: boolean;
  reset?: ResetFiltersButtonProps;
  children: ReactNode;
};

/** Below 768 px every filter moves into one drawer, each under its own label. */
export function FiltersDrawer({
  activeCount,
  disabled,
  reset,
  children,
}: Readonly<FiltersDrawerProps>) {
  const [open, setOpen] = useState(false);
  return (
    <ResponsivePanel
      open={open}
      onOpenChange={setOpen}
      desktopType="simple"
      drawerContentClassName="h-auto"
      trigger={<FiltersTrigger activeCount={activeCount} disabled={disabled} />}
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
      <FiltersDrawerFooter reset={reset} onDone={() => setOpen(false)} />
    </ResponsivePanel>
  );
}

type FiltersTriggerProps = { activeCount: number; disabled: boolean };

/** "Filters · n"; hidden from 768 px, and when no filter rendered anything. */
function FiltersTrigger({
  activeCount,
  disabled,
  ...props
}: Readonly<FiltersTriggerProps>) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      className={cn(
        "max-md:order-1 md:hidden",
        "group-has-[[data-slot=data-table-toolbar-inline-filters]:empty]/toolbar:hidden",
      )}
      {...props}
    >
      <ListFilter />
      {activeCount > 0 ? `Filters · ${activeCount}` : "Filters"}
    </Button>
  );
}

type FiltersDrawerFooterProps = {
  reset?: ResetFiltersButtonProps;
  onDone: () => void;
};

function FiltersDrawerFooter({
  reset,
  onDone,
}: Readonly<FiltersDrawerFooterProps>) {
  return (
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
      <Button type="button" onClick={onDone}>
        Done
      </Button>
    </ResponsivePanelFooter>
  );
}
