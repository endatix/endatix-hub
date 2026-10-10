const MAX_IMPORT_ROWS = 5_000;

export { MAX_IMPORT_ROWS };

/** Header cells of the first CSV record. Null when the file has no header. */
export function readCsvHeaders(csvText: string): string[] | null {
  const header = firstRecord(csvText);
  if (!header) return null;
  const cells = splitCsvRecord(header)
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
  return cells.length > 0 ? cells : null;
}

/** Data records after the header, capped check for the confirm step. */
export function countCsvDataRows(csvText: string): number {
  const header = firstRecord(csvText);
  if (!header) return 0;
  const rest = csvText.slice(header.length).replace(/^\r?\n/, "");
  if (!rest.trim()) return 0;
  return rest.split(/\r?\n/).filter((line) => line.trim() !== "").length;
}

export function exceedsImportLimit(rowCount: number): boolean {
  return rowCount > MAX_IMPORT_ROWS;
}

function firstRecord(csvText: string): string | null {
  const trimmed = csvText.replace(/^\uFEFF/, "");
  const end = trimmed.search(/\r?\n/);
  const record = (end === -1 ? trimmed : trimmed.slice(0, end)).trim();
  return record.length > 0 ? record : null;
}

function splitCsvRecord(record: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (const char of record) {
    if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}
