import { HubPageLoadError } from "@/components/error-handling/error-page";
import { PagedListFrame } from "@/components/table";
import { getSession } from "@/features/auth";
import { getClientEndatixConfig } from "@/features/config/server";
import { listQueryKey } from "@/lib/list-page/list-query-key";
import type { Route } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  canEditForm,
  loadSubmissionGridColumns,
} from "../browse-submissions.server";
import { describeGridReadiness } from "../grid-readiness";
import type { SubmissionGridColumnsLoad } from "../resolve-submission-grid-load";
import {
  applicableAnswerFilters,
  keptAnswerFilters,
} from "../submission-grid-answer-filters";
import {
  resolveVisibleAnswerColumns,
  type AnswerColumn,
  type ColumnSearchAccess,
} from "../submission-grid-columns";
import {
  buildSubmissionGridPath,
  isCanonicalSubmissionGridUrl,
  parseSubmissionGridUrl,
  type SubmissionGridRawSearchParams,
  type SubmissionGridUrlState,
} from "../submission-grid-url";
import { SubmissionGridRowsSection } from "./submission-grid-rows-section";
import { SubmissionGridShell } from "./submission-grid-shell";
import { SubmissionGridSkeleton } from "./submission-grid-skeleton";

type SubmissionGridSectionProps = {
  formId: string;
  searchParams: SubmissionGridRawSearchParams;
  /** Rendered instead when the form has no reporting grid (the API answers 404). */
  unavailable: ReactNode;
};

export async function SubmissionGridSection(
  props: Readonly<SubmissionGridSectionProps>,
) {
  const { formId, searchParams } = props;
  const { columns, ...access } = await loadGridInputs(formId);
  if (columns.kind === "unavailable") {
    return props.unavailable;
  }
  if (columns.kind === "error") {
    return <HubPageLoadError result={columns.result} />;
  }

  const urlState = parseGridUrl(searchParams, columns);
  if (!isCanonicalSubmissionGridUrl(searchParams, urlState)) {
    redirect(buildSubmissionGridPath(formId, urlState) as Route);
  }

  return <SubmissionGrid {...{ formId, urlState, columns, ...access }} />;
}

function parseGridUrl(
  searchParams: SubmissionGridRawSearchParams,
  { schemaReady, catalog }: ReadyColumns,
): SubmissionGridUrlState {
  const urlState = parseSubmissionGridUrl(searchParams);
  if (!schemaReady) {
    return urlState;
  }

  return {
    ...urlState,
    answerFilters: keptAnswerFilters(urlState.answerFilters, catalog),
  };
}

type ReadyColumns = Extract<SubmissionGridColumnsLoad, { kind: "ready" }>;

/** Only the rows wait for the columns; the other reads start together. */
async function loadGridInputs(formId: string) {
  const [columns, canIncludeInProgress, config] = await Promise.all([
    getSession().then((session) => loadSubmissionGridColumns(formId, session)),
    canEditForm(),
    getClientEndatixConfig(),
  ]);
  return {
    columns,
    canIncludeInProgress,
    submitterLabel: config.submitterPrimaryFilterLabel,
  };
}

type SubmissionGridProps = {
  formId: string;
  urlState: SubmissionGridUrlState;
  columns: ReadyColumns;
  canIncludeInProgress: boolean;
  submitterLabel: string;
};

function SubmissionGrid(props: Readonly<SubmissionGridProps>) {
  const { formId, columns, submitterLabel, canIncludeInProgress } = props;
  const rows = rowsRequest(props.urlState, columns);
  return (
    <SubmissionGridShell
      formId={formId}
      catalog={columns.catalog}
      columnSearch={columnSearchAccess(columns, canIncludeInProgress)}
      hasSubmissions={columns.readiness.submissions > 0}
      banner={gridBanner(props, rows.urlState.answerFilters.length)}
    >
      <SubmissionGridRows
        {...{ formId, submitterLabel, canIncludeInProgress }}
        {...rows}
      />
    </SubmissionGridShell>
  );
}

/** Choosing filterable columns needs `forms.edit`, as including in-progress does. */
function columnSearchAccess(
  columns: SubmissionGridProps["columns"],
  canEdit: boolean,
): ColumnSearchAccess {
  return { canEdit, slots: columns.searchSlots };
}

/**
 * The readiness banner. Without a schema it says the link's filters wait for
 * Prepare; with one, it steps aside for the rows' coverage while filters are
 * sent, and says when filters wait for a column still being prepared.
 */
function gridBanner(props: Readonly<SubmissionGridProps>, sentFilters: number) {
  const { columns, urlState } = props;
  const inUrl = urlState.answerFilters.length;
  return describeGridReadiness({
    ...columns,
    ...props,
    hasAnswerFilters: columns.schemaReady ? sentFilters > 0 : inUrl > 0,
    answerFiltersWaiting: columns.schemaReady && inUrl > sentFilters,
  });
}

/**
 * The rows' URL state and visible columns. Only the filters that apply are
 * sent: none without a schema, none on a column still being prepared.
 */
function rowsRequest(urlState: SubmissionGridUrlState, columns: ReadyColumns) {
  const answerFilters = columns.schemaReady
    ? applicableAnswerFilters(urlState.answerFilters, columns.catalog)
    : [];
  const rowsState = { ...urlState, answerFilters };
  const answerColumns = resolveVisibleAnswerColumns(
    columns.catalog,
    rowsState.columns,
    rowsState.answerFilters,
  );
  return { urlState: rowsState, answerColumns };
}

type SubmissionGridRowsProps = {
  formId: string;
  urlState: SubmissionGridUrlState;
  answerColumns: AnswerColumn[];
  submitterLabel: string;
  canIncludeInProgress: boolean;
};

/** The rows frame: keyed by the list query, so each query mounts fresh rows. */
function SubmissionGridRows(props: Readonly<SubmissionGridRowsProps>) {
  return (
    <PagedListFrame
      listKey={listQueryKey(props.urlState)}
      fallback={<GridRowsSkeleton {...props} />}
    >
      <SubmissionGridRowsSection {...props} />
    </PagedListFrame>
  );
}

function GridRowsSkeleton({
  urlState,
  answerColumns,
}: Readonly<SubmissionGridRowsProps>) {
  const answerTitles = answerColumns.map((column) => column.title);
  return (
    <SubmissionGridSkeleton
      pageSize={urlState.pageSize}
      answerTitles={answerTitles}
    />
  );
}
