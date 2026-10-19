import type { EntityId } from "../shared/types";
import type { ListSubmissionsRequest } from "../submissions/types";

/** Answer filter a column supports; `null` when it cannot be filtered. */
export type SubmissionGridFilterType = "text" | "date" | "datetime";

/** `auto`: picked from the schema; `user`: added by a form editor. */
export type SubmissionGridSearchSource = "auto" | "user";

/** A form's search keys used of the cap, and of the slots kept for people. */
export interface SubmissionGridSearchSlots {
  used: number;
  max: number;
  userUsed: number;
  userMax: number;
}

/** One column of a form's compiled reporting schema, in schema order. */
export interface SubmissionGridColumn {
  key: string;
  /** Schema column kind, e.g. `Simple`, `ChoiceIndicator`, `SubmitterProfile`. */
  kind: string;
  /** Header in the requested locale. */
  title: string;
  questionType: string | null;
  filterType: SubmissionGridFilterType | null;
  /**
   * Whether answer filters may use this column. Older APIs leave it out;
   * then a column with a `filterType` is filterable.
   */
  searchable?: boolean;
  /** The column is a search key whose search copy is still being rebuilt. */
  searchPending?: boolean;
  /** Who made the column a search key; `null` when it is not one. */
  searchSource?: SubmissionGridSearchSource | null;
  pageName: string | null;
  pageTitle: string | null;
  panelTitle: string | null;
}

/** How many of a form's submissions have prepared reporting data. */
export interface SubmissionGridReadiness {
  submissions: number;
  completedSubmissions: number;
  prepared: number;
  pending: number;
  failed: number;
  skippedInProgress: number;
}

/** `GET forms/{formId}/reporting/columns` */
export interface SubmissionGridColumnsResponse {
  formId: EntityId;
  /** Without a compiled schema, `columns` is empty. */
  schemaReady: boolean;
  readiness: SubmissionGridReadiness;
  columns: SubmissionGridColumn[];
  /** Left out by APIs that cannot choose search keys. */
  searchSlots?: SubmissionGridSearchSlots;
}

/** One of a form's search keys, as the search-keys endpoints return it. */
export interface SubmissionGridSearchKey {
  key: string;
  source: SubmissionGridSearchSource;
  filterType: SubmissionGridFilterType;
  /** Its search copy is still being rebuilt. */
  pending: boolean;
}

/** `POST` / `DELETE forms/{formId}/reporting/search-keys` */
export interface SubmissionGridSearchKeysResponse {
  formId: EntityId;
  keys: SubmissionGridSearchKey[];
  slots: SubmissionGridSearchSlots;
}

export interface ListSubmissionGridColumnsRequest {
  /** Title locale; the form's default locale when omitted. */
  locale?: string;
}

export type SubmissionGridRowState =
  | "prepared"
  | "stale"
  | "pending"
  | "failed"
  | "skipped"
  | "none";

/** `prepared` rows read flattened data; `raw` rows read the submission's answers. */
export type SubmissionGridAnswersSource = "prepared" | "raw";

/** One row of `GET forms/{formId}/reporting/submissions`. */
export interface SubmissionGridRow {
  id: EntityId;
  formId: EntityId;
  formDefinitionId: EntityId;
  isComplete: boolean;
  collectionStatus?: string;
  /** Review code (`new`, `read`, `approved`). */
  status: string;
  isTestSubmission?: boolean;
  createdAt: string;
  modifiedAt?: string;
  startedAt?: string;
  completedAt?: string;
  submitterId?: EntityId;
  submitterDisplayId?: string;
  submitterProfile?: Record<string, string>;
  rowState: SubmissionGridRowState;
  /** Keyed by the requested column keys; missing and null answers are left out. */
  answers: Record<string, unknown>;
  answersSource: SubmissionGridAnswersSource;
}

/** The rows endpoint refuses more answer keys than this. */
export const MAX_SUBMISSION_GRID_ROW_COLUMNS = 500;

/** The rows endpoint refuses more answer filters than this. */
export const MAX_SUBMISSION_GRID_ANSWER_FILTERS = 10;

/** The longest text a `contains` answer filter may search for. */
export const MAX_SUBMISSION_GRID_CONTAINS_LENGTH = 200;

/**
 * `contains` works on `text` columns; `from` / `to` on `date` and `datetime`
 * columns, as an inclusive `yyyy-MM-dd` calendar day.
 */
export type SubmissionGridAnswerOperator = "contains" | "from" | "to";

/** One answer filter; filters combine with AND, and with the metadata filters. */
export interface SubmissionGridAnswerFilter {
  operator: SubmissionGridAnswerOperator;
  key: string;
  value: string;
}

/**
 * Submissions the answer filters could not check because their prepared data
 * is missing or stale. Present only when the request had answer filters.
 */
export interface SubmissionGridAnswerFilterCoverage {
  uncheckedCompleted: number;
  uncheckedInProgress: number;
}

/** The submissions list query plus the answer keys to return. */
export interface ListSubmissionGridRowsRequest extends ListSubmissionsRequest {
  /** Answer keys to return, at most {@link MAX_SUBMISSION_GRID_ROW_COLUMNS}. None are returned when empty. */
  columns: readonly string[];
  /** At most {@link MAX_SUBMISSION_GRID_ANSWER_FILTERS}. */
  answerFilters?: readonly SubmissionGridAnswerFilter[];
}

/** 409 from the rows endpoint: the form has no compiled schema to filter answers by. */
export const REPORTING_NOT_PREPARED_ERROR_CODE = "reporting_not_prepared";
