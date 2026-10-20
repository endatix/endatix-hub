"use client";
"use no memo";

// TanStack Table keeps one table instance, so the React Compiler would cache
// what reads it and miss in-place state changes (column visibility, sizing).

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
  getCoreRowModel,
  useReactTable,
  type Row,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  answerDateFilter,
  answerFilterUrlKey,
  filtersByStoredChoiceValue,
} from "../submission-grid-answer-filters";
import type { AnswerColumn } from "../submission-grid-columns";
import {
  SUBMISSION_GRID_PAGE_SIZE_OPTIONS,
  SUBMISSION_GRID_URL_KEYS as keys,
} from "../submission-grid-url.constants";
import {
  answerDateRangeUpdate,
  clearFiltersUpdate,
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
    state: { sorting },
    onSortingChange: (updater: Updater<SortingState>) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      grid.updateUrl(sortUpdate(next));
    },
  });
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

type TextFilterOf = (
  key: string,
  placeholder: string,
) => SubmissionGridColumnFilters["submitterEmail"];

function toColumnFilters(
  grid: SubmissionGridUrl,
  submitterLabel: string,
): SubmissionGridColumnFilters {
  const { urlState, updateUrl, textFilters, setTextFilter } = grid;
  const textFilter: TextFilterOf = (key, placeholder) => ({
    value: textFilters[key] ?? "",
    placeholder,
    onChange: (value) => setTextFilter(key, value),
  });
  return {
    dates: dateFiltersByStem(urlState),
    onDateChange: (stem, value) => updateUrl(dateRangeUpdate(stem, value)),
    submitterDisplayId: textFilter(keys.submitterDisplayId, submitterLabel),
    submitterEmail: textFilter(keys.submitterEmail, "Email"),
    ...answerColumnFilters(grid, textFilter),
  };
}

function answerColumnFilters(
  { urlState, updateUrl }: SubmissionGridUrl,
  textFilter: TextFilterOf,
): Pick<SubmissionGridColumnFilters, "answerText" | "answerDate"> {
  return {
    answerText: (column) =>
      textFilter(
        answerFilterUrlKey("contains", column.key),
        answerTextPlaceholder(column),
      ),
    answerDate: ({ key }) => ({
      value: answerDateFilter(urlState.answerFilters, key),
      onChange: (value) => updateUrl(answerDateRangeUpdate(key, value)),
    }),
  };
}

function answerTextPlaceholder(column: AnswerColumn): string {
  return filtersByStoredChoiceValue(column)
    ? "Contains (stored choice value)"
    : "Contains";
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
      onClearFilters={() => grid.updateUrl(clearFiltersUpdate(grid.urlState))}
    />
  );
}
