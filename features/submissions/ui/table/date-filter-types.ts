export type DateFilterColumnId = "createdAt" | "startedAt" | "completedAt";

/**
 * Calendar date range for column filters. `from` / `to` are **UTC calendar** dates
 * in `YYYY-MM-DD` form (same validation as submission list URL params). Consumers
 * should not pass time-of-day or non-ISO strings.
 */
export type DateFilterValue = {
  /** Inclusive start day, `YYYY-MM-DD` (UTC calendar). */
  from?: string;
  /** Inclusive end day, `YYYY-MM-DD` (UTC calendar). */
  to?: string;
};

export type SubmissionDateFilters = Record<DateFilterColumnId, DateFilterValue>;

export type DateFilterChangeHandler = (
  columnId: DateFilterColumnId,
  value: DateFilterValue,
) => void;

export const EMPTY_SUBMISSION_DATE_FILTERS: SubmissionDateFilters = {
  createdAt: {},
  startedAt: {},
  completedAt: {},
};
