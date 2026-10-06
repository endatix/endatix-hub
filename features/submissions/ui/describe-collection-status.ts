import type { StatusTone } from "@/components/common/status-badge";

/**
 * Where the interview stands. The tone follows the group, never the code:
 * `unengaged` (the respondent has not answered anything yet) is idle, still
 * collecting (`open`) waits, `complete` succeeded, `ended` closed without
 * completing — a legitimate outcome, not a failure.
 */
export type CollectionStatusGroup = "unengaged" | "open" | "complete" | "ended";

const GROUP_TONE: Record<CollectionStatusGroup, StatusTone> = {
  unengaged: "idle",
  open: "attention",
  complete: "on",
  ended: "off",
};

/**
 * The lifecycle groups with the built-in codes each holds, in menu order:
 * Complete first, because it is the outcome most readers filter for, then the
 * rest in lifecycle order. The list facet, its trigger summary and the export
 * prefill all read this. A group label never repeats a member's label, so a
 * chip that says "Ended" cannot be mistaken for one code.
 */
export const COLLECTION_STATUS_GROUPS = [
  { group: "complete", label: "Complete", codes: ["complete"] },
  {
    group: "unengaged",
    label: "Not engaged",
    codes: ["not_started", "viewed"],
  },
  { group: "open", label: "Collecting", codes: ["in_progress", "expired"] },
  {
    group: "ended",
    label: "Ended",
    codes: ["screen_out", "quota_full", "abandoned", "cancelled"],
  },
] as const satisfies ReadonlyArray<{
  group: CollectionStatusGroup;
  label: string;
  codes: readonly string[];
}>;

export type CollectionStatusFilterCode =
  (typeof COLLECTION_STATUS_GROUPS)[number]["codes"][number];

/** Built-in codes the list facet can send, in menu order. */
export const COLLECTION_STATUS_FILTER_CODES: readonly CollectionStatusFilterCode[] =
  COLLECTION_STATUS_GROUPS.flatMap((entry) => entry.codes);

/** Tone of a lifecycle group, for UI that shows a group rather than a code. */
export function collectionStatusGroupTone(
  group: CollectionStatusGroup,
): StatusTone {
  return GROUP_TONE[group];
}

/**
 * Collection-status filter → the grid's old Complete (Yes / No) values, so
 * flows keyed on completion (the export prefill) keep following the grid.
 */
export function isCompleteValuesFromCollectionStatus(
  codes: Iterable<string>,
): Array<"true" | "false"> {
  const values = new Set<"true" | "false">();
  for (const code of codes) {
    values.add(code === "complete" ? "true" : "false");
  }
  return [...values];
}

/**
 * True when Completed / Incomplete / All selects exactly the rows the Status
 * filter shows: no filter or every code (All), only Complete (Completed), or
 * every not-complete code (Incomplete). Any other selection exports more than
 * the list shows.
 */
export function completionCoversCollectionStatus(
  codes: Iterable<string>,
): boolean {
  const selected = new Set(codes);
  const selectsExactly = (expected: readonly string[]) =>
    selected.size === expected.length &&
    expected.every((code) => selected.has(code));
  const notComplete = COLLECTION_STATUS_FILTER_CODES.filter(
    (code) => code !== "complete",
  );
  return (
    selected.size === 0 ||
    selectsExactly(COLLECTION_STATUS_FILTER_CODES) ||
    selectsExactly(["complete"]) ||
    selectsExactly(notComplete)
  );
}

/**
 * Legacy `isComplete` URL value (`true`, `false`, `true,false`) → the codes
 * it meant, so bookmarks and saved return links keep their filter.
 */
export function collectionStatusFromLegacyIsComplete(
  value: string | undefined,
): CollectionStatusFilterCode[] {
  const flags = new Set(value?.split(",") ?? []);
  const complete = flags.has("true");
  const incomplete = flags.has("false");
  if (complete === incomplete) {
    return [];
  }
  return COLLECTION_STATUS_FILTER_CODES.filter(
    (code) => (code === "complete") === complete,
  );
}

/** Built-in collection-status wire codes. Unknown codes are `ended`. */
const BUILT_IN: Record<
  string,
  { group: CollectionStatusGroup; label: string }
> = {
  not_started: { group: "unengaged", label: "Not started" },
  viewed: { group: "unengaged", label: "Viewed" },
  in_progress: { group: "open", label: "In progress" },
  expired: { group: "open", label: "Expired" },
  complete: { group: "complete", label: "Complete" },
  screen_out: { group: "ended", label: "Screened out" },
  quota_full: { group: "ended", label: "Quota full" },
  abandoned: { group: "ended", label: "Abandoned" },
  cancelled: { group: "ended", label: "Cancelled" },
};

export type CollectionStatusView = {
  group: CollectionStatusGroup;
  tone: StatusTone;
  label: string;
};

/** Grid and detail share this map. An unknown code is `ended`, labelled from the code. */
export function describeCollectionStatus(
  code: string | undefined,
  isComplete: boolean,
): CollectionStatusView {
  const supplied = code?.trim().toLowerCase();
  const key = supplied || (isComplete ? "complete" : "in_progress");
  const known = Object.hasOwn(BUILT_IN, key) ? BUILT_IN[key] : undefined;
  const { group, label } = known ?? {
    group: "ended",
    label: humanizeCode(supplied ?? ""),
  };

  return { group, tone: GROUP_TONE[group], label };
}

/**
 * Review (new / read / approved) is for what the respondent submitted, so the
 * control shows once collection is complete. A review already recorded on an
 * incomplete submission still shows, so nothing a reviewer did disappears.
 */
export function isReviewApplicable(
  collection: CollectionStatusView,
  reviewCode: string | undefined,
): boolean {
  const review = reviewCode?.trim().toLowerCase();
  return collection.group === "complete" || (!!review && review !== "new");
}

function humanizeCode(code: string): string {
  const words = code.replaceAll(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
