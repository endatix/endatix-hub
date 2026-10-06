import type { StatusTone } from "@/components/common/status-badge";

export type CollectionStatusGroup = "unengaged" | "open" | "complete" | "ended";

const GROUP_TONE: Record<CollectionStatusGroup, StatusTone> = {
  unengaged: "idle",
  open: "attention",
  complete: "on",
  ended: "off",
};

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

export const COLLECTION_STATUS_FILTER_CODES: readonly CollectionStatusFilterCode[] =
  COLLECTION_STATUS_GROUPS.flatMap((entry) => entry.codes);

export function collectionStatusGroupTone(
  group: CollectionStatusGroup,
): StatusTone {
  return GROUP_TONE[group];
}

export function isCompleteValuesFromCollectionStatus(
  codes: Iterable<string>,
): Array<"true" | "false"> {
  const values = new Set<"true" | "false">();
  for (const code of codes) {
    values.add(code === "complete" ? "true" : "false");
  }
  return [...values];
}

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
