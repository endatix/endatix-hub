/**
 * Mirrors the API: `Submission.IsResumableCollection` in
 * `oss/src/Endatix.Core/Entities/Submission.cs`. Both copies must agree, and
 * `collection-status.test.ts` pins this list.
 */
export const RESUMABLE_COLLECTION_STATUSES = [
  "not_started",
  "viewed",
  "in_progress",
  "expired",
] as const;

/** Stored when a screen-out trigger ends the interview. */
export const SCREEN_OUT_STATUS = "screen_out";

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

/**
 * Built-in codes that end the interview without completing it. The submissions
 * UI groups these as "Ended", along with unknown codes.
 */
export const CLOSED_COLLECTION_STATUSES = [
  SCREEN_OUT_STATUS,
  "quota_full",
  "abandoned",
  "cancelled",
] as const;

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
