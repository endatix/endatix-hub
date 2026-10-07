import type { StatusTone } from "@/components/common/status-badge";
import type { FacetedFilterGroup } from "@/components/table/faceted-filter-selection";
import {
  BUILT_IN_COLLECTION_STATUSES,
  collectionStatusGroupOf,
  isBuiltInCollectionStatus,
  SHIPPED_COLLECTION_STATUSES,
  type CollectionStatusCode,
  type CollectionStatusGroup,
} from "@/features/submissions/domain";

export type { CollectionStatusGroup };

const GROUP_TONE: Record<CollectionStatusGroup, StatusTone> = {
  unengaged: "idle",
  open: "attention",
  complete: "on",
  ended: "off",
};

/** Menu order: Complete first, then the lifecycle. */
const GROUP_LABEL = {
  complete: "Complete",
  unengaged: "Not engaged",
  open: "Collecting",
  ended: "Ended",
} as const satisfies Record<CollectionStatusGroup, string>;

const STATUS_LABEL: Record<CollectionStatusCode, string> = {
  not_started: "Not started",
  viewed: "Viewed",
  in_progress: "In progress",
  expired: "Expired",
  complete: "Complete",
  screen_out: "Screened out",
  quota_full: "Quota full",
  abandoned: "Abandoned",
  cancelled: "Cancelled",
};

/**
 * A code the list URL may filter by. Every built-in code parses, so a saved link
 * to an unshipped code keeps its filter; the menu offers only shipped codes.
 */
export type CollectionStatusFilterCode = CollectionStatusCode;

export function collectionStatusGroupTone(
  group: CollectionStatusGroup,
): StatusTone {
  return GROUP_TONE[group];
}

/** Maps the old `isComplete` URL flag: `true` is complete, `false` every other built-in code. */
export function collectionStatusFromLegacyIsComplete(
  value: string | undefined,
): CollectionStatusFilterCode[] {
  const flags = new Set(value?.split(",") ?? []);
  const complete = flags.has("true");
  const incomplete = flags.has("false");
  if (complete === incomplete) {
    return [];
  }
  return BUILT_IN_COLLECTION_STATUSES.filter(
    (code) => (code === "complete") === complete,
  );
}

export type CollectionStatusGroupEntry = {
  group: CollectionStatusGroup;
  label: string;
  codes: CollectionStatusCode[];
};

/**
 * The Status facet's groups in menu order: shipped codes, plus any built-in
 * code already selected (from an old link) so its chip shows and can be
 * cleared. Empty groups are left out.
 */
export function collectionStatusGroups(
  selected: Iterable<string> = [],
): CollectionStatusGroupEntry[] {
  const offered = new Set<CollectionStatusCode>(SHIPPED_COLLECTION_STATUSES);
  for (const code of selected) {
    if (isBuiltInCollectionStatus(code)) {
      offered.add(code);
    }
  }

  return (Object.keys(GROUP_LABEL) as CollectionStatusGroup[])
    .map((group) => ({
      group,
      label: GROUP_LABEL[group],
      codes: BUILT_IN_COLLECTION_STATUSES.filter(
        (code) => offered.has(code) && collectionStatusGroupOf(code) === group,
      ),
    }))
    .filter((entry) => entry.codes.length > 0);
}

/** The groups a fresh menu offers: shipped codes only. */
export const COLLECTION_STATUS_GROUPS = collectionStatusGroups();

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
  const { group, label } = isBuiltInCollectionStatus(key)
    ? { group: collectionStatusGroupOf(key), label: STATUS_LABEL[key] }
    : { group: "ended" as const, label: humanizeCode(supplied ?? "") };

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
 * dialog), so their menus cannot drift. Pass the current selection so a
 * selected unshipped code stays visible.
 */
export function collectionStatusFacetGroups(
  selected: Iterable<string> = [],
): FacetedFilterGroup[] {
  return collectionStatusGroups(selected).map(({ group, label, codes }) => ({
    label,
    tone: collectionStatusGroupTone(group),
    options: codes.map((code) => {
      const view = describeCollectionStatus(code, false);
      return { label: view.label, value: code, tone: view.tone };
    }),
  }));
}

/** The facet groups a fresh menu offers: shipped codes only. */
export const COLLECTION_STATUS_FACET_GROUPS: readonly FacetedFilterGroup[] =
  collectionStatusFacetGroups();
