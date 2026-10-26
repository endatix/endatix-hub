import { Result } from "@/lib/result";
import { readCsvRows, type CsvRow } from "@/lib/utils/csv";

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

function fileProblem(
  headers: string[],
  rowCount: number,
  maxRows: number,
): string | null {
  if (!headers.some(Boolean)) {
    return "The file has no header row. Its first row must name the columns.";
  }
  const repeated = repeatedHeader(headers);
  if (repeated) {
    return `The file has more than one column named ${repeated}. Rename one and try again.`;
  }
  if (rowCount === 0) return "The file has a header row but no participants.";
  if (rowCount <= maxRows) return null;
  return `The file has ${rowCount.toLocaleString()} rows. Import up to ${maxRows.toLocaleString()} at a time, so split it into smaller files.`;
}

/** The longest cell the API stages, matching OSS `StageAudienceImportChunkValidator.MaxCellLength`. */
const MAX_CELL_LENGTH = 4_000;

/** The first row with a cell the API would refuse; an unclosed quote is the usual cause. */
function cellProblem(rows: readonly CsvRow[]): string | null {
  const at = rows.findIndex((row) =>
    row.cells.some((cell) => cell.trim().length > MAX_CELL_LENGTH),
  );
  if (at < 0) return null;
  return `Row ${at + 2} has a cell longer than ${MAX_CELL_LENGTH.toLocaleString()} characters. Shorten it, or check the row for a stray quote.`;
}

/** A read file: its preview for the choices, and every data row for the upload. */
export type CsvFile = { preview: CsvPreview; rows: CsvRow[] };

/** The header, a sample per column and the data rows, or why the file cannot be imported. */
export function readCsvFile(csvText: string, maxRows: number): Result<CsvFile> {
  const [header, ...rows] = readCsvRows(csvText);
  const headers = (header?.cells ?? []).map((cell) => cell.trim());
  const problem =
    fileProblem(headers, rows.length, maxRows) ?? cellProblem(rows);
  if (problem) return Result.validationError(problem);
  const cells = rows.map((row) => row.cells);
  return Result.success({
    preview: {
      headers,
      samples: sampleValues(headers, cells),
      rowCount: rows.length,
    },
    rows,
  });
}
