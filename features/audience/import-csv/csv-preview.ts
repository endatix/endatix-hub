import { Result } from "@/lib/result";

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

/**
 * RFC 4180 records: a quoted cell may hold commas, line breaks and doubled quotes. A record ends
 * at `\r\n`, `\n` or a lone `\r` (old Mac exports). Only empty lines are dropped, as the API
 * drops them: a line of commas or spaces is a row there, so it is counted here too.
 */
class CsvRecords {
  private readonly records: string[][] = [];
  private record: string[] = [];
  private cell = "";
  private quoted = false;
  /** Whether the current record has consumed anything, so an empty line can be told apart. */
  private touched = false;

  constructor(private readonly text: string) {}

  read(): string[][] {
    for (let at = 0; at < this.text.length; at++) at = this.take(at);
    this.endRecord();
    return this.records;
  }

  /** Consumes the character at `at`; returns the index of the last character it used. */
  private take(at: number): number {
    const char = this.text[at];
    if (this.quoted) return this.takeQuoted(char, at);
    if (char === "\r") return this.takeCarriageReturn(at);
    if (char === "\n") {
      this.endRecord();
      return at;
    }
    this.touched = true;
    if (char === '"') this.quoted = true;
    else if (char === ",") this.endCell();
    else this.cell += char;
    return at;
  }

  /** `\r\n` and a lone `\r` both end the record; the `\n` of a pair is consumed with it. */
  private takeCarriageReturn(at: number): number {
    this.endRecord();
    return this.text[at + 1] === "\n" ? at + 1 : at;
  }

  private takeQuoted(char: string, at: number): number {
    if (char !== '"') {
      this.cell += char;
      return at;
    }
    if (this.text[at + 1] !== '"') {
      this.quoted = false;
      return at;
    }
    this.cell += '"';
    return at + 1;
  }

  private endCell(): void {
    this.record.push(this.cell);
    this.cell = "";
  }

  private endRecord(): void {
    this.endCell();
    if (this.touched) this.records.push(this.record);
    this.record = [];
    this.touched = false;
  }
}

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
  const [header = [], ...rows] = new CsvRecords(
    csvText.replace(/^\uFEFF/, ""),
  ).read();
  const headers = header.map((cell) => cell.trim());
  const problem = fileProblem(headers, rows.length);
  if (problem) return Result.validationError(problem);
  return Result.success({
    headers,
    samples: sampleValues(headers, rows),
    rowCount: rows.length,
  });
}
