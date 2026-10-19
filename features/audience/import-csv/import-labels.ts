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

type OutcomeParts = ReadonlyArray<[keyof AudienceImportResult, string]>;

const OUTCOME_PARTS: OutcomeParts = [
  ["createdCount", "added"],
  ["updatedCount", "updated"],
  ["skippedCount", "already on this form with nothing to change"],
  ["rejectedCount", "rejected"],
];

/** A test import never writes to people already here, so they are skipped, not "unchanged". */
const TEST_OUTCOME_PARTS: OutcomeParts = [
  ["createdCount", "added as test people"],
  ["updatedCount", "updated"],
  ["skippedCount", "skipped because they are already on this form"],
  ["rejectedCount", "rejected"],
];

/** The counts the reader can act on, zeros left out: `18 added, 2 updated, 3 rejected`. */
export function outcomeCounts(
  result: AudienceImportResult,
  { asTest = false }: { asTest?: boolean } = {},
): string {
  const parts = (asTest ? TEST_OUTCOME_PARTS : OUTCOME_PARTS)
    .filter(([key]) => Number(result[key]) > 0)
    .map(([key, label]) => `${Number(result[key]).toLocaleString()} ${label}`);
  return parts.length > 0 ? parts.join(", ") : "Nothing changed";
}
