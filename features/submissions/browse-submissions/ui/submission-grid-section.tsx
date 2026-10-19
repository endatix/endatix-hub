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
  loadSubmissionTestAccess,
} from "../browse-submissions.server";
import { describeGridReadiness } from "../grid-readiness";
import type { SubmissionGridColumnsLoad } from "../resolve-submission-grid-load";
import { applicableAnswerFilters } from "../submission-grid-answer-filters";
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

/** The submissions grid read from the form's prepared reporting data. */
export async function SubmissionGridSection(
  props: Readonly<SubmissionGridSectionProps>,
) {
  const { formId, searchParams } = props;
  const columns = await loadSubmissionGridColumns(formId, await getSession());
  if (columns.kind === "unavailable") {
    return props.unavailable;
  }
  if (columns.kind === "error") {
    return <HubPageLoadError result={columns.result} />;
  }

  const urlState = parseGridUrl(searchParams, columns.catalog);
  if (!isCanonicalSubmissionGridUrl(searchParams, urlState)) {
    redirect(buildSubmissionGridPath(formId, urlState) as Route);
  }

  return <SubmissionGrid {...{ formId, urlState, columns }} />;
}

/** Answer filters the form cannot apply leave the URL, so it names what shows. */
function parseGridUrl(
  searchParams: SubmissionGridRawSearchParams,
  catalog: readonly AnswerColumn[],
): SubmissionGridUrlState {
  const urlState = parseSubmissionGridUrl(searchParams);
  return {
    ...urlState,
    answerFilters: applicableAnswerFilters(urlState.answerFilters, catalog),
  };
}

type SubmissionGridProps = {
  formId: string;
  urlState: SubmissionGridUrlState;
  columns: Extract<SubmissionGridColumnsLoad, { kind: "ready" }>;
};

async function SubmissionGrid(props: Readonly<SubmissionGridProps>) {
  const { formId, urlState, columns } = props;
  const { canIncludeInProgress, access } = await loadGridAccess(columns);
  const answerColumns = resolveVisibleAnswerColumns(
    columns.catalog,
    urlState.columns,
  );
  const rows = { formId, urlState, answerColumns, canIncludeInProgress };
  return (
    <SubmissionGridShell
      formId={formId}
      catalog={columns.catalog}
      {...access}
      hasSubmissions={columns.readiness.submissions > 0}
      banner={describeGridReadiness({ ...columns, canIncludeInProgress })}
    >
      <SubmissionGridRows {...rows} />
    </SubmissionGridShell>
  );
}

/** What the user may change on the grid; a missing permission hides the control. */
async function loadGridAccess(columns: SubmissionGridProps["columns"]) {
  const [canIncludeInProgress, testAccess] = await Promise.all([
    canEditForm(),
    loadSubmissionTestAccess(),
  ]);
  const columnSearch = columnSearchAccess(columns, canIncludeInProgress);
  return { canIncludeInProgress, access: { columnSearch, testAccess } };
}

/** Choosing filterable columns needs `forms.edit`, as including in-progress does. */
function columnSearchAccess(
  columns: SubmissionGridProps["columns"],
  canEdit: boolean,
): ColumnSearchAccess {
  return { canEdit, slots: columns.searchSlots };
}

type SubmissionGridRowsProps = {
  formId: string;
  urlState: SubmissionGridUrlState;
  answerColumns: AnswerColumn[];
  canIncludeInProgress: boolean;
};

/** The rows frame: keyed by the list query, so each query mounts fresh rows. */
async function SubmissionGridRows(props: Readonly<SubmissionGridRowsProps>) {
  const { submitterPrimaryFilterLabel } = await getClientEndatixConfig();
  return (
    <PagedListFrame
      listKey={listQueryKey(props.urlState)}
      fallback={<GridRowsSkeleton {...props} />}
    >
      <SubmissionGridRowsSection
        {...props}
        submitterLabel={submitterPrimaryFilterLabel}
      />
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
