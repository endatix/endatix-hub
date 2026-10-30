/** The saved view's version before anyone saves one; saving it creates the view. */
export const UNSAVED_SUBMISSION_VIEW_VERSION = "0";

/** Widths the API accepts, in pixels. */
export const SUBMISSION_VIEW_COLUMN_WIDTH_RANGE = {
  min: 1,
  max: 4000,
} as const;

export type SubmissionViewSortDirection = "asc" | "desc";

/** One column of a saved view. Properties the Hub does not know are kept. */
export interface SubmissionViewColumnSetting {
  /** A schema key, or one of the grid's own metadata column ids. */
  key: string;
  visible?: boolean;
  width?: number;
  [property: string]: unknown;
}

export interface SubmissionViewSort {
  key: string;
  direction: SubmissionViewSortDirection;
}

/**
 * Settings v1 of a form's submissions grid view. A column not listed keeps
 * its default; the Hub saves every metadata column and the visible answer
 * columns. Properties the Hub does not know are kept.
 */
export interface SubmissionViewSettings {
  v: 1;
  columns: SubmissionViewColumnSetting[];
  pageSize?: number;
  sort?: SubmissionViewSort | null;
  [property: string]: unknown;
}

/** `GET`/`PUT forms/{formId}/reporting/submission-view`. */
export interface SubmissionView {
  /** Concurrency token, a long as a string; send back the one you read. */
  version: string;
  settings: SubmissionViewSettings;
}
