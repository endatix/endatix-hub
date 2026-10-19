import type { DateFilterValue } from "@/components/table/date-filter-types";
import type { SortingState } from "@tanstack/react-table";
import { answerFilterUrlKey } from "./submission-grid-answer-filters";
import {
  SUBMISSION_GRID_DATE_STEMS,
  SUBMISSION_GRID_SORT_FIELDS,
  SUBMISSION_GRID_URL_KEYS as keys,
} from "./submission-grid-url.constants";
import {
  serializeSubmissionGridSort,
  type SubmissionGridSortField,
  type SubmissionGridUrlState,
} from "./submission-grid-url";

export type SubmissionGridUrlUpdate = Record<string, string | null>;

export type SubmissionGridDateStem =
  (typeof SUBMISSION_GRID_DATE_STEMS)[number];

export type SubmissionGridFacetKey =
  | typeof keys.collectionStatus
  | typeof keys.status
  | typeof keys.isTestSubmission;

/** A new filter starts from the first page. */
export function facetUpdate(
  key: SubmissionGridFacetKey,
  values: Iterable<string>,
): SubmissionGridUrlUpdate {
  return { [key]: [...values].join(",") || null, page: null };
}

export function dateRangeUpdate(
  stem: SubmissionGridDateStem,
  value: DateFilterValue,
): SubmissionGridUrlUpdate {
  return {
    [`${stem}From`]: value.from ?? null,
    [`${stem}To`]: value.to ?? null,
    page: null,
  };
}

/** A date answer column's From/To; a new filter starts from the first page. */
export function answerDateRangeUpdate(
  key: string,
  value: DateFilterValue,
): SubmissionGridUrlUpdate {
  return {
    [answerFilterUrlKey("from", key)]: value.from ?? null,
    [answerFilterUrlKey("to", key)]: value.to ?? null,
    page: null,
  };
}

export function dateFiltersByStem(
  state: SubmissionGridUrlState,
): Record<SubmissionGridDateStem, DateFilterValue> {
  const entries = SUBMISSION_GRID_DATE_STEMS.map(
    (stem) =>
      [stem, { from: state[`${stem}From`], to: state[`${stem}To`] }] as const,
  );
  return Object.fromEntries(entries) as Record<
    SubmissionGridDateStem,
    DateFilterValue
  >;
}

export function sortUpdate(sorting: SortingState): SubmissionGridUrlUpdate {
  const first = sorting[0];
  const sortable = new Set<string>(SUBMISSION_GRID_SORT_FIELDS);
  const sort =
    first && sortable.has(first.id)
      ? serializeSubmissionGridSort({
          field: first.id as SubmissionGridSortField,
          direction: first.desc ? "desc" : "asc",
        })
      : undefined;

  return { [keys.sort]: sort ?? null };
}

export function sortingFromUrlState(
  state: SubmissionGridUrlState,
): SortingState {
  return state.sort
    ? [{ id: state.sort.field, desc: state.sort.direction === "desc" }]
    : [];
}

/** No keys: back to the default view. */
export function columnsUpdate(
  columnKeys: readonly string[],
): SubmissionGridUrlUpdate {
  return { [keys.columns]: columnKeys.join(",") || null };
}

export const CLEAR_SORT_UPDATE: SubmissionGridUrlUpdate = { [keys.sort]: null };

const CLEAR_METADATA_FILTERS_UPDATE: SubmissionGridUrlUpdate =
  Object.fromEntries(
    [
      keys.collectionStatus,
      keys.status,
      keys.isTestSubmission,
      keys.submitterDisplayId,
      keys.submitterEmail,
      ...SUBMISSION_GRID_DATE_STEMS.flatMap((stem) => [
        `${stem}From`,
        `${stem}To`,
      ]),
      keys.page,
    ].map((key) => [key, null]),
  );

/** Clears the metadata filters and every answer filter, hidden columns' too. */
export function clearFiltersUpdate(
  state: SubmissionGridUrlState,
): SubmissionGridUrlUpdate {
  const answerKeys = state.answerFilters.map(({ operator, key }) =>
    answerFilterUrlKey(operator, key),
  );
  return {
    ...CLEAR_METADATA_FILTERS_UPDATE,
    ...Object.fromEntries(answerKeys.map((key) => [key, null])),
  };
}

export function hasActiveFilters(state: SubmissionGridUrlState): boolean {
  const dateBounds = SUBMISSION_GRID_DATE_STEMS.flatMap((stem) => [
    state[`${stem}From`],
    state[`${stem}To`],
  ]);

  return (
    state.collectionStatus.length > 0 ||
    state.status.length > 0 ||
    state.isTestSubmission.length > 0 ||
    Boolean(state.submitterDisplayId || state.submitterEmail) ||
    dateBounds.some(Boolean) ||
    state.answerFilters.length > 0
  );
}
