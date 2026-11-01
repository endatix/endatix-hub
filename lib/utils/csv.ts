/**
 * RFC 4180 CSV, both ways: a quoted cell may hold commas, line breaks and doubled quotes. One
 * reader and one writer for every Hub file a reader brings or takes away.
 */

const BOM = "﻿";
const NEEDS_QUOTES = /[",\r\n]|^\s|\s$/;

/** One record and whether a stray quote made its cells unreliable. */
export type CsvRow = { cells: string[]; malformed: boolean };

const BLANK = /^[ \t]*$/;

class CsvRecordReader {
  private readonly records: CsvRow[] = [];
  private record: string[] = [];
  private cell = "";
  private quoted = false;
  /** Whether the current record has consumed anything, so an empty line can be told apart. */
  private touched = false;
  /** The current cell's closing quote has been read; only blanks may follow it. */
  private closed = false;
  private malformed = false;

  constructor(private readonly text: string) {}

  read(): CsvRow[] {
    for (let at = 0; at < this.text.length; at++) at = this.take(at);
    if (this.quoted) this.malformed = true;
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
    if (char === ",") this.endCell();
    else this.takeUnquoted(char);
    return at;
  }

  /**
   * A quote at the start of a cell opens a quoted cell. A quote inside an unquoted cell, or text
   * after a closing quote, is what CsvHelper (the API's parser) reports as bad data: it is kept as
   * text, so it cannot swallow the rows after it, and the row is marked.
   */
  private takeUnquoted(char: string): void {
    const opens = char === '"' && !this.closed && BLANK.test(this.cell);
    if (opens) {
      this.quoted = true;
      return;
    }
    if (char === '"' || (this.closed && !BLANK.test(char)))
      this.malformed = true;
    this.cell += char;
  }

  /** `\r\n` and a lone `\r` (old Mac exports) both end the record; a pair is consumed whole. */
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
      this.closed = true;
      return at;
    }
    this.cell += '"';
    return at + 1;
  }

  private endCell(): void {
    this.record.push(this.cell);
    this.cell = "";
    this.closed = false;
  }

  private endRecord(): void {
    this.endCell();
    if (this.touched)
      this.records.push({ cells: this.record, malformed: this.malformed });
    this.record = [];
    this.touched = false;
    this.malformed = false;
  }
}

/**
 * Every record of a CSV text, a leading byte-order mark dropped. Only empty lines are skipped, as
 * the API skips them: a line of commas or spaces is a row there, so it is a record here too.
 */
export function readCsvRecords(text: string): string[][] {
  return readCsvRows(text).map((row) => row.cells);
}

/** `readCsvRecords`, with each record marked when a stray quote makes its cells unreliable. */
export function readCsvRows(text: string): CsvRow[] {
  return new CsvRecordReader(text.replace(/^﻿/, "")).read();
}

const FORMULA = /^[=+\-@\t\r]/;

function csvCell(value: string): string {
  const safe = FORMULA.test(value) ? `'${value}` : value;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/**
 * Rows as CSV text with CRLF line ends and a byte-order mark, so Excel opens UTF-8 (accents,
 * non-Latin names) correctly; `readCsvRecords` reads it back unchanged.
 */
export function writeCsv(rows: readonly (readonly string[])[]): string {
  const lines = rows.map((row) => row.map((value) => csvCell(value)).join(","));
  return `${BOM}${lines.join("\r\n")}\r\n`;
}
