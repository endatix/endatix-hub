/**
 * Built-in codes that end the interview. `expired` stays open until
 * resume-after-expiry is decided. The submissions UI groups these as "Ended".
 */
export const CLOSED_COLLECTION_STATUSES = [
  "screen_out",
  "quota_full",
  "abandoned",
  "cancelled",
] as const;

const CLOSED_COLLECTION_STATUS_SET: ReadonlySet<string> = new Set(
  CLOSED_COLLECTION_STATUSES,
);

export type CollectionDisposition = "open" | "complete" | "closed";

/**
 * Missing and unknown codes stay open unless `IsComplete` is set. `IsComplete`
 * also covers rows written before `collectionStatus` existed.
 */
export function collectionDisposition(
  collectionStatus: string | undefined,
  isComplete: boolean,
): CollectionDisposition {
  if (collectionStatus && CLOSED_COLLECTION_STATUS_SET.has(collectionStatus)) {
    return "closed";
  }

  if (collectionStatus === "complete" || isComplete) {
    return "complete";
  }

  return "open";
}

/**
 * Message shown when an edit of a screened-out submission fails. The API
 * locks these rows for every caller until staff edits are allowed.
 */
export const SCREENED_OUT_EDIT_ERROR =
  "Screened-out submissions can't be edited yet.";

/** The save error to show for a submission, by its collection status. */
export function editSubmissionErrorMessage(
  collectionStatus: string | undefined,
): string {
  return collectionStatus === "screen_out"
    ? SCREENED_OUT_EDIT_ERROR
    : "Failed to save changes";
}
