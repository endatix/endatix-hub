/** Built-in codes that end the interview. `expired` stays open until resume-after-expiry is decided. */
const CLOSED_COLLECTION_STATUSES = new Set([
  "screen_out",
  "quota_full",
  "abandoned",
  "cancelled",
]);

export type CollectionDisposition = "open" | "complete" | "closed";

/**
 * Missing and unknown codes stay open. `IsComplete` covers rows written before
 * `collectionStatus` existed.
 */
export function collectionDisposition(
  collectionStatus: string | undefined,
  isComplete: boolean,
): CollectionDisposition {
  if (collectionStatus === "complete" || (!collectionStatus && isComplete)) {
    return "complete";
  }

  if (collectionStatus && CLOSED_COLLECTION_STATUSES.has(collectionStatus)) {
    return "closed";
  }

  return "open";
}
