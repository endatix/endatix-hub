"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { Label } from "@/components/ui/label";

type FilterField = { id: string };

const FiltersDrawerContext = createContext(false);

/** Marks its children as the Filters drawer's body, so each filter renders as a labelled field. */
export function FiltersDrawerScope({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <FiltersDrawerContext value>{children}</FiltersDrawerContext>;
}

/** True inside the toolbar's Filters drawer (below 768 px). */
export function useInFiltersDrawer(): boolean {
  return useContext(FiltersDrawerContext);
}

type DataTableFilterProps = {
  /** The field's label in the Filters drawer. */
  label: string;
  /** A render function receives the id the drawer's label points at. */
  children: ReactNode | ((field: Partial<FilterField>) => ReactNode);
};

/**
 * One toolbar filter that is not a `FacetedFilter` (a `Select`). In the toolbar it renders as
 * is; in the Filters drawer it sits under its own `Label`. `FacetedFilter` does this itself.
 */
export function DataTableFilter({
  label,
  children,
}: Readonly<DataTableFilterProps>) {
  const inDrawer = useInFiltersDrawer();
  const id = useId();
  if (!inDrawer) {
    return typeof children === "function" ? children({}) : children;
  }
  return (
    <div data-slot="data-table-filter-field" className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {typeof children === "function" ? children({ id }) : children}
    </div>
  );
}
