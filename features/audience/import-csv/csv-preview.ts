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
 * RFC 4180 records: a quoted cell may hold commas, line breaks and doubled quotes. Blank lines
 * are dropped, as the API drops them.
 */
class CsvRecords {
  private readonly records: string[][] = [];
  private record: string[] = [];
  private cell = "";
  private quoted = false;

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
    if (char === '"') this.quoted = true;
    else if (char === ",") this.endCell();
    else if (char === "\n") this.endRecord();
    else if (char !== "\r") this.cell += char;
    return at;
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
    if (this.record.some((cell) => cell.trim() !== "")) {
      this.records.push(this.record);
    }
    this.record = [];
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

function fileProblem(headers: string[], rowCount: number): string | null {
  if (!headers.some(Boolean)) {
    return "The file has no header row. Its first row must name the columns.";
  }
  if (rowCount === 0) return "The file has a header row but no people.";
  if (rowCount <= MAX_IMPORT_ROWS) return null;
  return `The file has ${rowCount.toLocaleString()} rows. Import up to ${MAX_IMPORT_ROWS.toLocaleString()} at a time, so split it into smaller files.`;
}

/** The header, a sample per column and the row count, or why the file cannot be imported. */
export function readCsvPreview(csvText: string): Result<CsvPreview> {
  const [header = [], ...rows] = new CsvRecords(
    csvText.replace(/^﻿/, ""),
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
