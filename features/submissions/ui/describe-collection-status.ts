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

/** Built-in codes the list facet can send. Order is the menu order. */
export const COLLECTION_STATUS_FILTER_CODES = [
  "not_started",
  "viewed",
  "in_progress",
  "expired",
  "complete",
  "screen_out",
  "quota_full",
  "abandoned",
  "cancelled",
] as const;

export type CollectionStatusFilterCode =
  (typeof COLLECTION_STATUS_FILTER_CODES)[number];

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
