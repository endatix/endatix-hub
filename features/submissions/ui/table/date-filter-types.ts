import type { DateFilterValue } from '@/components/table/date-filter-types';

export type { DateFilterValue } from '@/components/table/date-filter-types';

export type DateFilterColumnId =
  | 'createdAt'
  | 'modifiedAt'
  | 'startedAt'
  | 'completedAt';

export type SubmissionDateFilters = Record<DateFilterColumnId, DateFilterValue>;

export type DateFilterChangeHandler = (
  columnId: DateFilterColumnId,
  value: DateFilterValue,
) => void;

export const EMPTY_SUBMISSION_DATE_FILTERS: SubmissionDateFilters = {
  createdAt: {},
  modifiedAt: {},
  startedAt: {},
  completedAt: {},
};
