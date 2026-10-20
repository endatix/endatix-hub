/**
 * Whether answer filters can use a column, read from the reporting columns
 * catalog. The grid's picker and the form's settings share it.
 */
import type {
  SubmissionGridColumn,
  SubmissionGridSearchSlots,
  SubmissionGridSearchSource,
} from "@/lib/endatix-api/reporting/submission-grid-types";

/** Schema kind of the submitter profile columns (`submitter_email`, …). */
export const SUBMITTER_PROFILE_KIND = "SubmitterProfile";

/**
 * Whether answer filters can use a column:
 * - `ready`: it is a search key and its search copy is built.
 * - `preparing`: it is a search key whose search copy is being rebuilt.
 * - `eligible`: it has a filter type but is not a search key; an editor can add it.
 * - `unavailable`: it has no filter type, or it is a submitter column, which
 *   keeps the profile filters of the list.
 */
export type ColumnSearchState =
  | "ready"
  | "preparing"
  | "eligible"
  | "unavailable";

export type ColumnSearch = {
  state: ColumnSearchState;
  /** Who made the column a search key; `null` when it is not one. */
  source: SubmissionGridSearchSource | null;
};

/**
 * Reads the catalog's search flags. An API older than the search keys leaves
 * them out; then every column with a filter type is ready.
 */
export function columnSearchOf(column: SubmissionGridColumn): ColumnSearch {
  const source = column.searchSource ?? null;
  if (!column.filterType || column.kind === SUBMITTER_PROFILE_KIND) {
    return { state: "unavailable", source };
  }
  if (column.searchable === false) {
    return { state: "eligible", source: null };
  }

  return { state: column.searchPending ? "preparing" : "ready", source };
}

/** What an editor can do about a column's filter; people's keys only. */
export type SearchKeyChange = "add" | "remove";

export function searchKeyChangeFor(
  search: ColumnSearch,
  canEdit: boolean,
): SearchKeyChange | null {
  if (!canEdit) return null;
  if (search.state === "eligible") return "add";
  return search.source === "user" ? "remove" : null;
}

/** Whether every slot kept for people, or the form's whole cap, is used. */
export function areSearchSlotsFull(slots: SubmissionGridSearchSlots): boolean {
  return slots.userUsed >= slots.userMax || slots.used >= slots.max;
}

/** "3 of 14 chosen"; the API refuses a pick past either cap. */
export function describeUserSlots(slots: SubmissionGridSearchSlots): string {
  const used = `${slots.userUsed} of ${slots.userMax} chosen`;
  return areSearchSlotsFull(slots) ? `${used}, none left` : used;
}
