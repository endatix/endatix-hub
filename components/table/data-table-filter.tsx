"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { Label } from "@/components/ui/label";

/** `id` for a control a `Label` can point at; `labelId` for a group named by the label. */
type FilterField = { id: string; labelId: string };

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
  /** `control` (default): the label points at the control's `id`. `group`: it names a group by `labelId`. */
  labels?: "control" | "group";
  /** A render function receives the id the drawer's label points at. */
  children: ReactNode | ((field: Partial<FilterField>) => ReactNode);
};

/**
 * One toolbar filter that is not a `FacetedFilter` (a `Select`). In the toolbar it renders as
 * is; in the Filters drawer it sits under its own `Label`. `FacetedFilter` does this itself.
 */
export function DataTableFilter({
  label,
  labels = "control",
  children,
}: Readonly<DataTableFilterProps>) {
  const inDrawer = useInFiltersDrawer();
  const id = useId();
  const labelId = `${id}-label`;
  if (!inDrawer) {
    return typeof children === "function" ? children({}) : children;
  }
  return (
    <div data-slot="data-table-filter-field" className="grid gap-2">
      <Label id={labelId} htmlFor={labels === "control" ? id : undefined}>
        {label}
      </Label>
      {typeof children === "function" ? children({ id, labelId }) : children}
    </div>
  );
}
