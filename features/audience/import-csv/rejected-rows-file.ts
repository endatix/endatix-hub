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

/** `panel.csv` → `panel-rejected-rows.csv`. */
export function rejectedRowsFileName(fileName: string): string {
  return `${fileName.replace(/\.csv$/i, "")}-rejected-rows.csv`;
}
