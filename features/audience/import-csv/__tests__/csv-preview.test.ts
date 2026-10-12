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

  it("explains a file it cannot import", () => {
    expect(problem("   ")).toMatch(/no header row/);
    expect(problem("email\n")).toMatch(/no people/);
    expect(problem(`email\n${"a@b.co\n".repeat(5_001)}`)).toMatch(
      /5,001 rows\. Import up to 5,000/,
    );
  });
});
