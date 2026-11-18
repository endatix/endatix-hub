"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  DataTableToolbar,
  type ResetFiltersButtonProps,
} from "@/components/table";
import {
  countActiveSubmissionFacets,
  SubmissionsFacets,
} from "./filters/submissions-facets";
import {
  ColumnViewOptionsDropdown,
  ColumnViewOptionsItems,
  ResetLayoutItems,
} from "./table";

type SubmissionsListToolbarProps = {
  disabled: boolean;
  facets: Omit<ComponentProps<typeof SubmissionsFacets>, "disabled">;
  reset: ResetFiltersButtonProps;
  columns: ComponentProps<typeof ColumnViewOptionsItems>["columns"];
  exportAction: ReactNode;
  /** Set once on the client; the items render while the layout is not the default. */
  layoutReset?: Omit<ComponentProps<typeof ResetLayoutItems>, "disabled">;
};

/** The legacy list's toolbar: facets, Reset, View (⋯ below 768 px), Export, Reset table layout in ⋯. */
export function SubmissionsListToolbar({
  disabled,
  facets,
  reset,
  columns,
  exportAction,
  layoutReset,
}: Readonly<SubmissionsListToolbarProps>) {
  return (
    <DataTableToolbar
      className="mt-8 mb-4"
      filters={<SubmissionsFacets {...facets} disabled={disabled} />}
      activeFilterCount={countActiveSubmissionFacets(facets)}
      filtersDisabled={disabled}
      reset={{ ...reset, disabled }}
      collapsibleActions={{
        inline: (
          <ColumnViewOptionsDropdown columns={columns} disabled={disabled} />
        ),
        menuItems: (
          <ColumnViewOptionsItems columns={columns} disabled={disabled} />
        ),
      }}
      actions={exportAction}
      moreActions={
        layoutReset && layoutReset.options.length > 0 ? (
          <ResetLayoutItems {...layoutReset} disabled={disabled} />
        ) : undefined
      }
    />
  );
}
