"use client";

import {
  createPagedTableFooterProps,
  DataTableEmpty,
  DataTableGrid,
  DataTableSurface,
  PagedTableFooter,
} from "@/components/table";
import { NoMatchingSubmissionsEmptyState } from "@/features/submissions/ui/submissions-empty-state";
import type { SubmissionGridRowsPage } from "@/lib/endatix-api/reporting/submission-grid";
import type { SubmissionGridRow } from "@/lib/endatix-api/reporting/submission-grid-types";
import {
  functionalUpdate,
  getCoreRowModel,
  useReactTable,
  type Row,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { AnswerColumn } from "../submission-grid-columns";
import {
  SUBMISSION_GRID_PAGE_SIZE_OPTIONS,
  SUBMISSION_GRID_URL_KEYS as keys,
} from "../submission-grid-url.constants";
import {
  CLEAR_FILTERS_UPDATE,
  dateFiltersByStem,
  dateRangeUpdate,
  hasActiveFilters,
  sortingFromUrlState,
  sortUpdate,
} from "../submission-grid-url-updates";
import {
  buildSubmissionGridColumns,
  type SubmissionGridColumnFilters,
} from "./submission-grid-column-defs";
import {
  useSubmissionGridUrl,
  type SubmissionGridUrl,
} from "./submission-grid-url-context";
import {
  useSubmissionGridView,
  type SubmissionGridView,
} from "./submission-grid-view-context";

export type SubmissionGridTableProps = {
  page: SubmissionGridRowsPage;
  answerColumns: readonly AnswerColumn[];
  /** The deployment's name for the submitter id column. */
  submitterLabel: string;
};

export function SubmissionGridTable(props: Readonly<SubmissionGridTableProps>) {
  const grid = useSubmissionGridUrl();
  const table = useSubmissionGridTable(props, grid);
  const openSubmission = useOpenSubmission();
  return (
    <DataTableSurface data-slot="submission-grid">
      <DataTableGrid
        table={table}
        isPending={grid.isPending}
        hasRows={props.page.items.length > 0}
        empty={<GridEmpty grid={grid} />}
        onRowClick={openSubmission}
      />
      <GridFooter page={props.page} updateUrl={grid.updateUrl} />
    </DataTableSurface>
  );
}

function GridFooter({
  page,
  updateUrl,
}: Readonly<{
  page: SubmissionGridRowsPage;
  updateUrl: UrlSearchParamsUpdater;
}>) {
  return (
    <PagedTableFooter
      {...createPagedTableFooterProps(page, "submissions", updateUrl)}
      pageSizeOptions={SUBMISSION_GRID_PAGE_SIZE_OPTIONS}
      variant="surface"
    />
  );
}

function useSubmissionGridTable(
  props: SubmissionGridTableProps,
  grid: SubmissionGridUrl,
) {
  const columns = useGridColumns(props, grid);
  const sorting = sortingFromUrlState(grid.urlState);
  const data = useRowData(props.page);
  return useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualSorting: true,
    ...resizableView(useSubmissionGridView(), sorting),
    onSortingChange: (updater: Updater<SortingState>) =>
      grid.updateUrl(sortUpdate(functionalUpdate(updater, sorting))),
  });
}

/** Widths, visibility and order come from the unsaved view. */
function resizableView(view: SubmissionGridView, sorting: SortingState) {
  return {
    enableColumnResizing: true,
    state: { sorting, ...view.tableLayout },
    onColumnSizingChange: view.onColumnSizingChange,
  };
}

function useRowData({ items }: SubmissionGridRowsPage) {
  return useMemo(() => [...items], [items]);
}

function useGridColumns(
  { answerColumns, submitterLabel }: SubmissionGridTableProps,
  grid: SubmissionGridUrl,
) {
  return useMemo(
    () =>
      buildSubmissionGridColumns(
        answerColumns,
        toColumnFilters(grid, submitterLabel),
      ),
    [answerColumns, grid, submitterLabel],
  );
}

function toColumnFilters(
  { urlState, updateUrl, textFilters, setTextFilter }: SubmissionGridUrl,
  submitterLabel: string,
): SubmissionGridColumnFilters {
  const textFilter = (key: string, placeholder: string) => ({
    value: textFilters[key] ?? "",
    placeholder,
    onChange: (value: string) => setTextFilter(key, value),
  });
  return {
    dates: dateFiltersByStem(urlState),
    onDateChange: (stem, value) => updateUrl(dateRangeUpdate(stem, value)),
    submitterDisplayId: textFilter(keys.submitterDisplayId, submitterLabel),
    submitterEmail: textFilter(keys.submitterEmail, "Email"),
  };
}

function useOpenSubmission() {
  const router = useRouter();
  return ({ original }: Row<SubmissionGridRow>) =>
    router.push(`/forms/${original.formId}/submissions/${original.id}`, {
      scroll: false,
    });
}

function GridEmpty({ grid }: Readonly<{ grid: SubmissionGridUrl }>) {
  if (!hasActiveFilters(grid.urlState)) {
    return <DataTableEmpty>No submissions found.</DataTableEmpty>;
  }

  return (
    <NoMatchingSubmissionsEmptyState
      onClearFilters={() => grid.updateUrl(CLEAR_FILTERS_UPDATE)}
    />
  );
}
