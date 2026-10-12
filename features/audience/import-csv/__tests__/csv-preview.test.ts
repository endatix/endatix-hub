import { describe, expect, it } from "vitest";
import { Result } from "@/lib/result";
import { readCsvPreview } from "../csv-preview";

function preview(csv: string) {
  const read = readCsvPreview(csv);
  if (Result.isError(read)) throw new Error(read.message);
  return read.value;
}

function problem(csv: string): string {
  const read = readCsvPreview(csv);
  return Result.isError(read) ? read.message : "";
}

describe("readCsvPreview", () => {
  it("reads quoted headers, and samples each column's first values", () => {
    const csv =
      '﻿email,"display, name"\nada@example.com,Ada\n\ngrace@example.com,"Grace ""G"""\n';

    expect(preview(csv)).toEqual({
      headers: ["email", "display, name"],
      samples: {
        email: ["ada@example.com", "grace@example.com"],
        "display, name": ["Ada", 'Grace "G"'],
      },
      rowCount: 2,
    });
  });

  it("counts a quoted cell with a line break as one row", () => {
    const csv = 'id,note\r\n1,"two\r\nlines"\r\n2,plain\r\n';

    expect(preview(csv).rowCount).toBe(2);
    expect(preview(csv).samples.note).toEqual(["two\r\nlines", "plain"]);
  });

  it("ends a record at a lone carriage return, as old Mac exports write", () => {
    const csv = "id,city\r1,Columbus\r2,Dayton\r";

    expect(preview(csv).rowCount).toBe(2);
    expect(preview(csv).samples.city).toEqual(["Columbus", "Dayton"]);
  });

  it("counts a line of commas as a row, as the API does, and drops only empty lines", () => {
    const csv = "id,city\n1,Columbus\n\n,\n";

    expect(preview(csv).rowCount).toBe(2);
  });

  it("refuses two columns with the same name, whatever their case", () => {
    expect(problem("Email,city,email\na@b.co,X,c@d.co\n")).toMatch(
      /more than one column named email/,
    );
  });

  it("explains a file it cannot import", () => {
    expect(problem("   ")).toMatch(/no header row/);
    expect(problem("email\n")).toMatch(/no people/);
    expect(problem(`email\n${"a@b.co\n".repeat(5_001)}`)).toMatch(
      /5,001 rows\. Import up to 5,000/,
    );
  });
});
