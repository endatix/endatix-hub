/**
 * RFC 4180 CSV, both ways: a quoted cell may hold commas, line breaks and doubled quotes. One
 * reader and one writer for every Hub file a reader brings or takes away.
 */

const BOM = "﻿";
const NEEDS_QUOTES = /[",\r\n]|^\s|\s$/;

class CsvRecordReader {
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

/**
 * Every record of a CSV text, a leading byte-order mark dropped. Only empty lines are skipped, as
 * the API skips them: a line of commas or spaces is a row there, so it is a record here too.
 */
export function readCsvRecords(text: string): string[][] {
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
  const lines = rows.map((row) => row.map(csvCell).join(","));
  return `${BOM}${lines.join("\r\n")}\r\n`;
}
