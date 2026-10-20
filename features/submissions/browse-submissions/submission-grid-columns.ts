import {
  columnSearchOf,
  type ColumnSearch,
} from "@/features/submissions/choose-filterable-questions/filterable-questions";
import { answerParamsBytes } from "@/lib/endatix-api/reporting/submission-grid-answer-params";
import { fitRowColumns } from "@/lib/endatix-api/reporting/submission-grid-row-columns";
import type {
  SubmissionGridAnswerFilter,
  SubmissionGridColumn,
  SubmissionGridSearchSlots,
  SubmissionGridFilterType,
  SubmissionGridRow,
} from "@/lib/endatix-api/reporting/submission-grid-types";

/**
 * Ids of the grid's own columns. A saved view keeps these keys although they
 * are not in the form schema, so they must match the API's
 * `SubmissionViewColumns.MetadataKeys`.
 */
export const SUBMISSION_GRID_METADATA_COLUMN_IDS = [
  "complete",
  "modifiedAt",
  "startedAt",
  "completedAt",
  "createdAt",
  "submitterDisplayId",
  "completionTime",
  "status",
] as const;

export type SubmissionGridMetadataColumnId =
  (typeof SUBMISSION_GRID_METADATA_COLUMN_IDS)[number];

export const DEFAULT_VISIBLE_ANSWER_COLUMNS = 10;

const DEFAULT_VIEW_KINDS: ReadonlySet<string> = new Set(["Simple"]);
const SUBMITTER_PROFILE_KIND = "SubmitterProfile";
const SUBMITTER_PROFILE_KEY_PREFIX = "submitter_";

/** Where a question sits in the form; the column picker groups by it. */
export type AnswerColumnPlacement = {
  pageName: string | null;
  pageTitle: string | null;
  panelTitle: string | null;
};

export type AnswerColumn = {
  key: string;
  kind: string;
  title: string;
  questionType: string | null;
  /** The answer filter the column offers now; `null` when it offers none. */
  filterType: SubmissionGridFilterType | null;
  /** Whether answer filters can use the column, or could once an editor adds it. */
  search: ColumnSearch;
  placement: AnswerColumnPlacement;
};

/** What the grid may do about filterable columns for this user. */
export type ColumnSearchAccess = {
  /** `forms.edit`: make columns filterable and remove the ones people chose. */
  canEdit: boolean;
  /** Left out by an API that cannot choose search keys. */
  slots?: SubmissionGridSearchSlots;
};

export function toAnswerColumns(
  columns: readonly SubmissionGridColumn[],
): AnswerColumn[] {
  return columns.map((column) =>
    toAnswerColumn(column, columnSearchOf(column)),
  );
}

function toAnswerColumn(
  column: SubmissionGridColumn,
  search: ColumnSearch,
): AnswerColumn {
  return {
    key: column.key,
    kind: column.kind,
    title: column.title || column.key,
    questionType: column.questionType,
    filterType: search.state === "ready" ? column.filterType : null,
    search,
    placement: {
      pageName: column.pageName,
      pageTitle: column.pageTitle,
      panelTitle: column.panelTitle,
    },
  };
}

/**
 * The answer columns to show, in order. Requested keys the schema no longer
 * has are dropped, and the rest stop at what the rows endpoint accepts
 * beside the answer filters' params. Without a request, the first question
 * columns show.
 */
export function resolveVisibleAnswerColumns(
  catalog: readonly AnswerColumn[],
  requestedKeys: readonly string[] | undefined,
  answerFilters: readonly SubmissionGridAnswerFilter[] = [],
): AnswerColumn[] {
  if (requestedKeys === undefined) {
    return catalog
      .filter((column) => DEFAULT_VIEW_KINDS.has(column.kind))
      .slice(0, DEFAULT_VISIBLE_ANSWER_COLUMNS);
  }

  const byKey = new Map(catalog.map((column) => [column.key, column]));
  const known = requestedKeys.flatMap((key) => byKey.get(key) ?? []);
  const fitted = fitRowColumns(
    known.map((column) => column.key),
    [],
    answerParamsBytes(answerFilters),
  );
  return known.slice(0, fitted.length);
}

/**
 * The grid column id of an answer column. Schema keys can equal a metadata
 * column id (a question named `status`), so answer ids carry a prefix.
 */
export function answerColumnId(key: string): string {
  return `answer:${key}`;
}

/**
 * A row's answer for a column. A submitter column falls back to the row's
 * profile, since raw answers never carry it.
 */
export function readAnswer(
  row: SubmissionGridRow,
  column: AnswerColumn,
): unknown {
  const answer = row.answers[column.key];
  if (answer !== undefined || column.kind !== SUBMITTER_PROFILE_KIND) {
    return answer;
  }

  return row.submitterProfile?.[submitterProfileField(column.key)];
}

export function submitterProfileField(key: string): string {
  return key.startsWith(SUBMITTER_PROFILE_KEY_PREFIX)
    ? key.slice(SUBMITTER_PROFILE_KEY_PREFIX.length)
    : key;
}

export function isSubmitterProfileColumn(
  column: Pick<AnswerColumn, "kind">,
): boolean {
  return column.kind === SUBMITTER_PROFILE_KIND;
}

export function formatAnswerValue(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (Array.isArray(value)) {
    const items = value.map(formatAnswerValue).filter((item) => item !== null);
    return items.length > 0 ? items.join(", ") : null;
  }

  return formatScalar(value);
}

function formatScalar(value: unknown): string | null {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
      return value.toString();
    case "object":
      return JSON.stringify(value);
    default:
      return null;
  }
}
