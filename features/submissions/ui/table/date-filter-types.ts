export type DateFilterColumnId = "createdAt" | "completedAt";

export type DateFilterValue = {
  from?: string;
  to?: string;
};

export type SubmissionDateFilters = Record<DateFilterColumnId, DateFilterValue>;

export type DateFilterChangeHandler = (
  columnId: DateFilterColumnId,
  value: DateFilterValue,
) => void;

export const EMPTY_SUBMISSION_DATE_FILTERS: SubmissionDateFilters = {
  createdAt: {},
  completedAt: {},
};
