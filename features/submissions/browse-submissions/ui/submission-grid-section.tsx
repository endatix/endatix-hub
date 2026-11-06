import { HubPageLoadError } from "@/components/error-handling/error-page";
import { PagedListFrame } from "@/components/table";
import { getSession } from "@/features/auth";
import { getClientEndatixConfig } from "@/features/config/server";
import type { SubmissionExportAccess } from "@/features/export";
import { listQueryKey } from "@/lib/list-page/list-query-key";
import type { Route } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  canEditSubmissionGrid,
  loadSubmissionGridColumns,
  loadSubmissionExportAccess,
  loadSubmissionGridView,
  loadSubmissionTestAccess,
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
} from "../submission-grid-columns";
import {
  buildSubmissionGridPath,
  isCanonicalSubmissionGridUrl,
  parseSubmissionGridUrl,
  type SubmissionGridRawSearchParams,
  type SubmissionGridUrlState,
} from "../submission-grid-url";
import {
  withSavedView,
  type SubmissionGridViewLoad,
} from "../submission-grid-view";
import type { SubmissionTestAccess } from "../submission-test-flag";
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
  const { columns, view, ...access } = await loadGridInputs(formId);
  if (columns.kind === "unavailable") {
    return props.unavailable;
  }
  if (columns.kind === "error") {
    return <HubPageLoadError result={columns.result} />;
  }

  const urlState = gridUrlState(formId, searchParams, { columns, view });
  return <SubmissionGrid {...{ formId, urlState, columns, view, ...access }} />;
}

/**
 * The state the grid shows: a non-canonical URL redirects first, then the
 * saved view fills in what the URL leaves out.
 */
function gridUrlState(
  formId: string,
  searchParams: SubmissionGridRawSearchParams,
  { columns, view }: { columns: ReadyColumns; view: SubmissionGridViewLoad },
): SubmissionGridUrlState {
  const urlState = parseGridUrl(searchParams, columns);
  if (!isCanonicalSubmissionGridUrl(searchParams, urlState)) {
    redirect(buildSubmissionGridPath(formId, urlState) as Route);
  }

  return withSavedView(urlState, searchParams, view.settings);
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
  const session = getSession();
  const [columns, view, canEdit, testAccess, exportAccess, config] =
    await Promise.all([
      session.then((current) => loadSubmissionGridColumns(formId, current)),
      session.then((current) => loadSubmissionGridView(formId, current)),
      canEditSubmissionGrid(),
      loadSubmissionTestAccess(),
      loadSubmissionExportAccess(),
      getClientEndatixConfig(),
    ]);
  const submitterLabel = config.submitterPrimaryFilterLabel;
  return { columns, view, canEdit, testAccess, exportAccess, submitterLabel };
}

type SubmissionGridProps = {
  formId: string;
  urlState: SubmissionGridUrlState;
  columns: ReadyColumns;
  view: SubmissionGridViewLoad;
  /** Form editors choose search keys and save the view. */
  canEdit: boolean;
  /** Mark as test / Mark as real in each row, Delete test submissions in the toolbar. */
  testAccess: SubmissionTestAccess;
  /** Export in the toolbar, Prepare and Include in-progress in the banners, Rebuild in the dialog. */
  exportAccess: SubmissionExportAccess;
  submitterLabel: string;
};

function SubmissionGrid(props: Readonly<SubmissionGridProps>) {
  const { formId, columns, view, submitterLabel, exportAccess } = props;
  const rows = rowsRequest(props.urlState, columns);
  return (
    <SubmissionGridShell
      {...gridChrome(props, rows.urlState.answerFilters.length)}
      formId={formId}
      view={view}
    >
      <SubmissionGridRows
        {...{ formId, submitterLabel }}
        canPrepare={exportAccess.canPrepare}
        {...rows}
      />
    </SubmissionGridShell>
  );
}

function gridChrome(props: Readonly<SubmissionGridProps>, sentFilters: number) {
  const { columns, canEdit, urlState } = props;
  const inUrl = urlState.answerFilters.length;
  return {
    catalog: columns.catalog,
    toolbar: {
      columnSearch: { canEdit, slots: columns.searchSlots },
      exportAccess: props.exportAccess,
    },
    hasSubmissions: columns.readiness.submissions > 0,
    banner: describeGridReadiness({
      ...columns,
      canPrepare: props.exportAccess.canPrepare,
      hasAnswerFilters: columns.schemaReady ? sentFilters > 0 : inUrl > 0,
      answerFiltersWaiting: columns.schemaReady && inUrl > sentFilters,
    }),
    canSaveView: canEdit,
    testAccess: props.testAccess,
  };
}

/** The rows' URL state and visible columns: without a schema, no answer filter is sent. */
function rowsRequest(urlState: SubmissionGridUrlState, columns: ReadyColumns) {
  const answerFilters = sentAnswerFilters(urlState, columns);
  const rowsState = { ...urlState, answerFilters };
  const answerColumns = resolveVisibleAnswerColumns(
    columns.catalog,
    rowsState.columns,
    rowsState.answerFilters,
  );
  return { urlState: rowsState, answerColumns };
}

/** None without a schema; none on a column that cannot filter now. */
function sentAnswerFilters(
  urlState: SubmissionGridUrlState,
  { schemaReady, catalog }: ReadyColumns,
) {
  return schemaReady
    ? applicableAnswerFilters(urlState.answerFilters, catalog)
    : [];
}

type SubmissionGridRowsProps = {
  formId: string;
  urlState: SubmissionGridUrlState;
  answerColumns: AnswerColumn[];
  submitterLabel: string;
  canPrepare: boolean;
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
