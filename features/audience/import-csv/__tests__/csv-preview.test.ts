import { describe, expect, it } from "vitest";
import {
  countCsvDataRows,
  exceedsImportLimit,
  readCsvHeaders,
} from "../csv-preview";

describe("csv preview", () => {
  it("reads a quoted header and counts the data rows", () => {
    const csv = 'email,"display name"\nada@example.com,Ada\n';

    expect(readCsvHeaders(csv)).toEqual(["email", "display name"]);
    expect(countCsvDataRows(csv)).toBe(1);
    expect(exceedsImportLimit(5001)).toBe(true);
  });

  it("returns null when the file has no header", () => {
    expect(readCsvHeaders("   ")).toBeNull();
    expect(countCsvDataRows("")).toBe(0);
  });
});
