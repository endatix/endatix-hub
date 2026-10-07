import type { StatusTone } from "@/components/common/status-badge";
import type { FacetedFilterGroup } from "@/components/table/faceted-filter-selection";
import {
  CLOSED_COLLECTION_STATUSES,
  OFFERED_COLLECTION_STATUSES,
} from "@/features/submissions/domain/collection-status";

export type CollectionStatusGroup = "unengaged" | "open" | "complete" | "ended";

const GROUP_TONE: Record<CollectionStatusGroup, StatusTone> = {
  unengaged: "idle",
  open: "attention",
  complete: "on",
  ended: "off",
};

const OFFERED_COLLECTION_STATUS_SET: ReadonlySet<string> = new Set(
  OFFERED_COLLECTION_STATUSES,
);

const COLLECTION_STATUS_GROUP_DEFINITIONS = [
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
    codes: CLOSED_COLLECTION_STATUSES,
  },
] as const satisfies ReadonlyArray<{
  group: CollectionStatusGroup;
  label: string;
  codes: readonly string[];
}>;

export type CollectionStatusFilterCode =
  (typeof OFFERED_COLLECTION_STATUSES)[number];

export const COLLECTION_STATUS_FILTER_CODES: readonly CollectionStatusFilterCode[] =
  OFFERED_COLLECTION_STATUSES;

export function collectionStatusGroupTone(
  group: CollectionStatusGroup,
): StatusTone {
  return GROUP_TONE[group];
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

export const COLLECTION_STATUS_GROUPS = COLLECTION_STATUS_GROUP_DEFINITIONS.map(
  (entry) => {
    const codes = entry.codes.filter((code) =>
      OFFERED_COLLECTION_STATUS_SET.has(code),
    );
    const label = codes.length === 1 ? BUILT_IN[codes[0]].label : entry.label;
    return { group: entry.group, label, codes };
  },
).filter((entry) => entry.codes.length > 0);

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

/**
 * The Status facet's groups, each code as the badge the grid shows. One
 * definition for every surface that filters by status (list toolbar, export
 * dialog), so their menus cannot drift. Declared last: it reads `BUILT_IN`.
 */
export const COLLECTION_STATUS_FACET_GROUPS: readonly FacetedFilterGroup[] =
  COLLECTION_STATUS_GROUPS.map(({ group, label, codes }) => ({
    label,
    tone: collectionStatusGroupTone(group),
    options: codes.map((code) => {
      const view = describeCollectionStatus(code, false);
      return { label: view.label, value: code, tone: view.tone };
    }),
  }));
