import type {
  AudienceImportCheck,
  AudienceImportLimits,
  AudienceImportWritten,
} from "@/lib/endatix-api/audience/types";

/** `1 row`, `5,000 rows`: what the file holds, before anything is known about the participants. */
export function rowCountLabel(count: number): string {
  return count === 1 ? "1 row" : `${count.toLocaleString()} rows`;
}

/** Sample values as one muted line, `·` apart because a value may hold a comma (`London, UK`). */
export function sampleLabel(values: readonly string[] | undefined): string {
  if (!values?.length) return "Empty in the first rows of the file.";
  return `Values like ${values.join(" · ")}`;
}

/** `1 participant`, `1,200 participants`. */
export function participantCountLabel(count: number): string {
  return count === 1 ? "1 participant" : `${count.toLocaleString()} participants`;
}

const MEGABYTE = 1024 * 1024;

/** `50 MB`, `1.5 MB`, `300 KB`: a file size as a person reads it. */
export function sizeLabel(bytes: number): string {
  if (bytes >= MEGABYTE) return `${Number((bytes / MEGABYTE).toFixed(1))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** What this host imports, said before a file is chosen. */
export function limitsLabel(limits: AudienceImportLimits): string {
  return `Up to ${limits.maxRows.toLocaleString()} rows and ${sizeLabel(limits.maxBytes)}.`;
}

/** The Check's preview, zeros left out: `1,200 new participants, 3 rejected`. */
export function checkCounts(check: AudienceImportCheck): string {
  const parts = [
    check.newCount > 0 &&
      (check.newCount === 1
        ? "1 new participant"
        : `${check.newCount.toLocaleString()} new participants`),
    check.existingCount > 0 &&
      `${check.existingCount.toLocaleString()} already on this form`,
    check.rejectedCount > 0 && `${check.rejectedCount.toLocaleString()} rejected`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "No rows to import";
}

type OutcomeParts = ReadonlyArray<[keyof AudienceImportWritten, string]>;

const OUTCOME_PARTS: OutcomeParts = [
  ["createdCount", "added"],
  ["updatedCount", "updated"],
  ["skippedCount", "already on this form with nothing to change"],
  ["rejectedCount", "rejected"],
];

/** A test import never writes to participants already here, so they are skipped, not "unchanged". */
const TEST_OUTCOME_PARTS: OutcomeParts = [
  ["createdCount", "added as test participants"],
  ["skippedCount", "skipped because they are already on this form"],
  ["rejectedCount", "rejected"],
];

/** The counts the reader can act on, zeros left out: `18 added, 2 updated, 3 rejected`. */
export function outcomeCounts(
  result: AudienceImportWritten,
  { asTest = false }: { asTest?: boolean } = {},
): string {
  const parts = (asTest ? TEST_OUTCOME_PARTS : OUTCOME_PARTS)
    .filter(([key]) => Number(result[key]) > 0)
    .map(([key, label]) => `${Number(result[key]).toLocaleString()} ${label}`);
  return parts.length > 0 ? parts.join(", ") : "Nothing changed";
}
