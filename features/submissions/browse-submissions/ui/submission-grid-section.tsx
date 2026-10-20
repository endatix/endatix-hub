import { HubPageLoadError } from "@/components/error-handling/error-page";
import { PagedListFrame } from "@/components/table";
import { getSession } from "@/features/auth";
import { getClientEndatixConfig } from "@/features/config/server";
import { listQueryKey } from "@/lib/list-page/list-query-key";
import type { Route } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  canIncludeInProgressSubmissions,
  loadSubmissionGridColumns,
} from "../browse-submissions.server";
import { describeGridReadiness } from "../grid-readiness";
import type { SubmissionGridColumnsLoad } from "../resolve-submission-grid-load";
import { applicableAnswerFilters } from "../submission-grid-answer-filters";
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

/**
 * Answer filters the form cannot apply leave the URL, so it names what
 * shows. Without a schema none apply yet, so a link keeps them for later.
 */
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
    answerFilters: applicableAnswerFilters(urlState.answerFilters, catalog),
  };
}

/** The rows request: without a schema, no answer filter is sent. */
function rowsUrlState(
  urlState: SubmissionGridUrlState,
  { schemaReady }: ReadyColumns,
): SubmissionGridUrlState {
  return schemaReady ? urlState : { ...urlState, answerFilters: [] };
}

type ReadyColumns = Extract<SubmissionGridColumnsLoad, { kind: "ready" }>;

/** Only the rows wait for the columns; the other reads start together. */
async function loadGridInputs(formId: string) {
  const [columns, canIncludeInProgress, config] = await Promise.all([
    getSession().then((session) => loadSubmissionGridColumns(formId, session)),
    canIncludeInProgressSubmissions(),
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
  const urlState = rowsUrlState(props.urlState, columns);
  const answerColumns = resolveVisibleAnswerColumns(
    columns.catalog,
    urlState.columns,
    urlState.answerFilters,
  );
  const hasAnswerFilters = props.urlState.answerFilters.length > 0;
  return (
    <SubmissionGridShell
      formId={formId}
      catalog={columns.catalog}
      hasSubmissions={columns.readiness.submissions > 0}
      banner={describeGridReadiness({ ...columns, ...props, hasAnswerFilters })}
    >
      <SubmissionGridRows
        {...{ formId, urlState, answerColumns, submitterLabel }}
        canIncludeInProgress={canIncludeInProgress}
      />
    </SubmissionGridShell>
  );
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
