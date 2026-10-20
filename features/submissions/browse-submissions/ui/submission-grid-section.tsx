import { HubPageLoadError } from "@/components/error-handling/error-page";
import { PagedListFrame } from "@/components/table";
import { getSession } from "@/features/auth";
import { getClientEndatixConfig } from "@/features/config/server";
import { listQueryKey } from "@/lib/list-page/list-query-key";
import type { Route } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  canEditSubmissionGrid,
  loadSubmissionGridColumns,
  loadSubmissionGridView,
} from "../browse-submissions.server";
import { describeGridReadiness } from "../grid-readiness";
import type { SubmissionGridColumnsLoad } from "../resolve-submission-grid-load";
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
import { SubmissionGridRowsSection } from "./submission-grid-rows-section";
import { SubmissionGridShell } from "./submission-grid-shell";
import { SubmissionGridSkeleton } from "./submission-grid-skeleton";

type SubmissionGridSectionProps = {
  formId: string;
  searchParams: SubmissionGridRawSearchParams;
  /** Rendered instead when the form has no reporting grid (the API answers 404). */
  unavailable: ReactNode;
};

/** The submissions grid read from the form's prepared reporting data. */
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

  const urlState = gridUrlState(formId, searchParams, view);
  return <SubmissionGrid {...{ formId, urlState, columns, view, ...access }} />;
}

/**
 * The state the grid shows: a non-canonical URL redirects first, then the
 * saved view fills in what the URL leaves out.
 */
function gridUrlState(
  formId: string,
  searchParams: SubmissionGridRawSearchParams,
  view: SubmissionGridViewLoad,
): SubmissionGridUrlState {
  const urlState = parseSubmissionGridUrl(searchParams);
  if (!isCanonicalSubmissionGridUrl(searchParams, urlState)) {
    redirect(buildSubmissionGridPath(formId, urlState) as Route);
  }

  return withSavedView(urlState, searchParams, view.settings);
}

/** Only the rows wait for the columns; the other reads start together. */
async function loadGridInputs(formId: string) {
  const session = getSession();
  const [columns, view, canEdit, config] = await Promise.all([
    session.then((current) => loadSubmissionGridColumns(formId, current)),
    session.then((current) => loadSubmissionGridView(formId, current)),
    canEditSubmissionGrid(),
    getClientEndatixConfig(),
  ]);
  const submitterLabel = config.submitterPrimaryFilterLabel;
  return { columns, view, canEdit, submitterLabel };
}

type SubmissionGridProps = {
  formId: string;
  /** The URL with the saved view filled in where the URL says nothing. */
  urlState: SubmissionGridUrlState;
  columns: Extract<SubmissionGridColumnsLoad, { kind: "ready" }>;
  view: SubmissionGridViewLoad;
  canEdit: boolean;
  submitterLabel: string;
};

function SubmissionGrid(props: Readonly<SubmissionGridProps>) {
  const { formId, urlState, columns, view, submitterLabel } = props;
  const answerColumns = resolveVisibleAnswerColumns(
    columns.catalog,
    urlState.columns,
  );
  return (
    <SubmissionGridShell
      {...gridChrome(columns, props.canEdit)}
      formId={formId}
      view={view}
    >
      <SubmissionGridRows
        {...{ formId, urlState, answerColumns, submitterLabel }}
      />
    </SubmissionGridShell>
  );
}

/** Editors include in-progress submissions and save the view. */
function gridChrome(columns: SubmissionGridProps["columns"], canEdit: boolean) {
  return {
    catalog: columns.catalog,
    hasSubmissions: columns.readiness.submissions > 0,
    banner: describeGridReadiness({
      ...columns,
      canIncludeInProgress: canEdit,
    }),
    canSaveView: canEdit,
  };
}

type SubmissionGridRowsProps = {
  formId: string;
  urlState: SubmissionGridUrlState;
  answerColumns: AnswerColumn[];
  submitterLabel: string;
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
