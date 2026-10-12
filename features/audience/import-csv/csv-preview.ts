import { Result } from "@/lib/result";
import { readCsvRecords } from "@/lib/utils/csv";

/** The most data rows one import takes; the API refuses more. */
export const MAX_IMPORT_ROWS = 5_000;

const SAMPLE_SIZE = 3;

export type CsvPreview = {
  /** Header cells in file order, trimmed; an unnamed column stays as `""` so positions hold. */
  headers: string[];
  /** The first non-empty values of each column, so every choice is made against real data. */
  samples: Record<string, string[]>;
  rowCount: number;
};

function firstValues(rows: string[][], column: number): string[] {
  const values: string[] = [];
  for (const row of rows) {
    const value = row[column]?.trim();
    if (value) values.push(value);
    if (values.length === SAMPLE_SIZE) break;
  }
  return values;
}

function sampleValues(headers: string[], rows: string[][]) {
  return Object.fromEntries(
    headers.map((header, column) => [header, firstValues(rows, column)]),
  );
}

/** A named column that appears twice; the API matches names without case, so `Email` = `email`. */
function repeatedHeader(headers: string[]): string | undefined {
  const seen = new Set<string>();
  return headers.find((header) => {
    if (!header) return false;
    const key = header.toLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
}

function fileProblem(headers: string[], rowCount: number): string | null {
  if (!headers.some(Boolean)) {
    return "The file has no header row. Its first row must name the columns.";
  }
  const repeated = repeatedHeader(headers);
  if (repeated) {
    return `The file has more than one column named ${repeated}. Rename one and try again.`;
  }
  if (rowCount === 0) return "The file has a header row but no people.";
  if (rowCount <= MAX_IMPORT_ROWS) return null;
  return `The file has ${rowCount.toLocaleString()} rows. Import up to ${MAX_IMPORT_ROWS.toLocaleString()} at a time, so split it into smaller files.`;
}

/** The header, a sample per column and the row count, or why the file cannot be imported. */
export function readCsvPreview(csvText: string): Result<CsvPreview> {
  const [header = [], ...rows] = readCsvRecords(csvText);
  const headers = header.map((cell) => cell.trim());
  const problem = fileProblem(headers, rows.length);
  if (problem) return Result.validationError(problem);
  return Result.success({
    headers,
    samples: sampleValues(headers, rows),
    rowCount: rows.length,
  });
}
