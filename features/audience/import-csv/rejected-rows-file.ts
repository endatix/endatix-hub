import type { AudienceImportRejectedRow } from "@/lib/endatix-api/audience/types";
import { writeCsv } from "@/lib/utils/csv";

export const REJECTED_ROWS_FILE_MIME = "text/csv";

/** The rows the import left out, as the scripter fixes them: line, reason, then the file's own cells. */
export function rejectedRowsCsv(
  headers: readonly string[],
  rows: readonly AudienceImportRejectedRow[],
): string {
  return writeCsv([
    ["Line", "Reason", ...headers],
    ...rows.map((row) => [String(row.rowNumber), row.reason, ...row.cells]),
  ]);
}

/** `panel.csv` → `panel-rejected-rows-2026-11-02.csv`, dated so a second file never overwrites the first. */
export function rejectedRowsFileName(
  fileName: string,
  at: Date = new Date(),
): string {
  const date = at.toISOString().slice(0, 10);
  return `${fileName.replace(/\.csv$/i, "")}-rejected-rows-${date}.csv`;
}
