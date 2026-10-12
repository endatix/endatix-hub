import type { AudienceImportResult } from "@/lib/endatix-api/audience/types";

/** `1 row`, `5,000 rows`: what the file holds, before anything is known about the people. */
export function rowCountLabel(count: number): string {
  return count === 1 ? "1 row" : `${count.toLocaleString()} rows`;
}

/** Sample values as one muted line, `·` apart because a value may hold a comma (`London, UK`). */
export function sampleLabel(values: readonly string[] | undefined): string {
  if (!values?.length) return "Empty in the first rows of the file.";
  return `Values like ${values.join(" · ")}`;
}

const OUTCOME_PARTS: ReadonlyArray<[keyof AudienceImportResult, string]> = [
  ["createdCount", "added"],
  ["updatedCount", "updated"],
  ["skippedCount", "already on this form with nothing to change"],
  ["rejectedCount", "rejected"],
];

/** The counts the reader can act on, zeros left out: `18 added, 2 updated, 3 rejected`. */
export function outcomeCounts(result: AudienceImportResult): string {
  const parts = OUTCOME_PARTS.filter(([key]) => Number(result[key]) > 0).map(
    ([key, label]) => `${Number(result[key]).toLocaleString()} ${label}`,
  );
  return parts.length > 0 ? parts.join(", ") : "Nothing changed";
}
