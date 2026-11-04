import type {
  SubmissionGridColumn,
  SubmissionGridSearchSlots,
  SubmissionGridSearchSource,
} from "@/lib/endatix-api/reporting/submission-grid-types";

export const SUBMITTER_PROFILE_KIND = "SubmitterProfile";

export type ColumnSearchState =
  | "ready"
  | "preparing"
  | "eligible"
  | "unavailable";

export type ColumnSearch = {
  state: ColumnSearchState;
  source: SubmissionGridSearchSource | null;
};

/**
 * An API older than the search keys leaves the flags out; then every column
 * with a filter type is ready.
 */
export function columnSearchOf(column: SubmissionGridColumn): ColumnSearch {
  const source = column.searchSource ?? null;
  if (!offersAnswerFilter(column)) {
    return { state: "unavailable", source };
  }
  if (column.searchable === false) {
    return { state: "eligible", source: null };
  }

  return { state: column.searchPending ? "preparing" : "ready", source };
}

/** Submitter columns keep the list's profile filters instead. */
function offersAnswerFilter(column: SubmissionGridColumn): boolean {
  return column.filterType !== null && column.kind !== SUBMITTER_PROFILE_KIND;
}

export type SearchKeyChange = "add" | "remove";

export function searchKeyChangeFor(
  search: ColumnSearch,
  canEdit: boolean,
): SearchKeyChange | null {
  if (!canEdit) return null;
  if (search.state === "eligible") return "add";
  return search.source === "user" ? "remove" : null;
}

export function areSearchSlotsFull(slots: SubmissionGridSearchSlots): boolean {
  return slots.userUsed >= slots.userMax || slots.used >= slots.max;
}

export function describeUserSlots(slots: SubmissionGridSearchSlots): string {
  const used = `${slots.userUsed} of ${slots.userMax} chosen`;
  return areSearchSlotsFull(slots) ? `${used}, none left` : used;
}
