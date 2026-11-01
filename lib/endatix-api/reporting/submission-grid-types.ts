import type { EntityId } from "../shared/types";
import type { ListSubmissionsRequest } from "../submissions/types";

/** Answer filter a column supports; `null` when it cannot be filtered. */
export type SubmissionGridFilterType = "text" | "date" | "datetime";

/** One column of a form's compiled reporting schema, in schema order. */
export interface SubmissionGridColumn {
  key: string;
  /** Schema column kind, e.g. `Simple`, `ChoiceIndicator`, `SubmitterProfile`. */
  kind: string;
  /** Header in the requested locale. */
  title: string;
  questionType: string | null;
  filterType: SubmissionGridFilterType | null;
  pageName: string | null;
  pageTitle: string | null;
  panelTitle: string | null;
}

/** How many of a form's submissions have prepared reporting data. */
export interface SubmissionGridReadiness {
  submissions: number;
  completedSubmissions: number;
  /** Submissions not completed, whether or not they have a prepared row. */
  inProgress: number;
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

/** The submissions list query plus the answer keys to return. */
export interface ListSubmissionGridRowsRequest extends ListSubmissionsRequest {
  /** Answer keys to return, at most {@link MAX_SUBMISSION_GRID_ROW_COLUMNS}. None are returned when empty. */
  columns: readonly string[];
}
