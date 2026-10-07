/**
 * Where a code sits in the interview lifecycle. The submissions UI groups and
 * colors badges by it.
 */
export type CollectionStatusGroup = "unengaged" | "open" | "complete" | "ended";

/**
 * Every built-in collection status, in lifecycle order. The one place a code is
 * defined; the lists below are derived from it.
 * - `resumable`: the API lets the respondent continue
 *   (`Submission.IsResumableCollection` in `oss/src/Endatix.Core/Entities/Submission.cs`).
 * - `shipped`: the API writes this code today. Unshipped codes are legal and keep
 *   their badge, but filters do not offer them.
 */
export const COLLECTION_STATUS_CATALOG = [
  { code: "not_started", group: "unengaged", resumable: true, shipped: true },
  { code: "viewed", group: "unengaged", resumable: true, shipped: false },
  { code: "in_progress", group: "open", resumable: true, shipped: true },
  { code: "expired", group: "open", resumable: true, shipped: false },
  { code: "complete", group: "complete", resumable: false, shipped: true },
  { code: "screen_out", group: "ended", resumable: false, shipped: true },
  { code: "quota_full", group: "ended", resumable: false, shipped: false },
  { code: "abandoned", group: "ended", resumable: false, shipped: false },
  { code: "cancelled", group: "ended", resumable: false, shipped: false },
] as const satisfies ReadonlyArray<{
  code: string;
  group: CollectionStatusGroup;
  resumable: boolean;
  shipped: boolean;
}>;

type CatalogEntry = (typeof COLLECTION_STATUS_CATALOG)[number];

/** A built-in collection status code. Rows may also hold unknown codes. */
export type CollectionStatusCode = CatalogEntry["code"];

/** A code the API writes today. */
export type ShippedCollectionStatus = Extract<
  CatalogEntry,
  { shipped: true }
>["code"];

/** Built-in codes in lifecycle order. */
export const BUILT_IN_COLLECTION_STATUSES: readonly CollectionStatusCode[] =
  COLLECTION_STATUS_CATALOG.map((entry) => entry.code);

/** Codes the API writes today, in lifecycle order. Filters offer only these. */
export const SHIPPED_COLLECTION_STATUSES: readonly ShippedCollectionStatus[] =
  COLLECTION_STATUS_CATALOG.filter(
    (entry): entry is Extract<CatalogEntry, { shipped: true }> => entry.shipped,
  ).map((entry) => entry.code);

/** Codes the API resumes. `collection-status.test.ts` pins this list. */
export const RESUMABLE_COLLECTION_STATUSES: readonly CollectionStatusCode[] =
  COLLECTION_STATUS_CATALOG.filter((entry) => entry.resumable).map(
    (entry) => entry.code,
  );

/** Stored when a screen-out trigger ends the interview. */
export const SCREEN_OUT_STATUS = "screen_out" satisfies CollectionStatusCode;

const BUILT_IN_COLLECTION_STATUS_SET: ReadonlySet<string> = new Set(
  BUILT_IN_COLLECTION_STATUSES,
);

export function isBuiltInCollectionStatus(
  code: string,
): code is CollectionStatusCode {
  return BUILT_IN_COLLECTION_STATUS_SET.has(code);
}

const GROUP_BY_CODE = Object.fromEntries(
  COLLECTION_STATUS_CATALOG.map((entry) => [entry.code, entry.group]),
) as Record<CollectionStatusCode, CollectionStatusGroup>;

/** The lifecycle group of a built-in code. */
export function collectionStatusGroupOf(
  code: CollectionStatusCode,
): CollectionStatusGroup {
  return GROUP_BY_CODE[code];
}

/**
 * The API rejects every edit of a screened-out submission, staff edits
 * included, until endatix/endatix#1179. Hide the editor instead of failing at
 * save.
 */
export function isSubmissionEditable(
  collectionStatus: string | undefined,
): boolean {
  return collectionStatus !== SCREEN_OUT_STATUS;
}

const RESUMABLE_COLLECTION_STATUS_SET: ReadonlySet<string> = new Set(
  RESUMABLE_COLLECTION_STATUSES,
);

export type CollectionDisposition = "open" | "complete" | "closed";

/**
 * `IsComplete` covers rows written before `collectionStatus` existed. Any other
 * code the API would not resume, unknown codes included, is closed.
 */
export function collectionDisposition(
  collectionStatus: string | undefined,
  isComplete: boolean,
): CollectionDisposition {
  if (collectionStatus === "complete" || isComplete) {
    return "complete";
  }

  const isResumable =
    !collectionStatus || RESUMABLE_COLLECTION_STATUS_SET.has(collectionStatus);
  return isResumable ? "open" : "closed";
}
