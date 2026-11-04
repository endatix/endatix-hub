import { describe, expect, it } from "vitest";
import { readCsvRecords } from "@/lib/utils/csv";
import { rejectedRowsCsv, rejectedRowsFileName } from "../rejected-rows-file";

describe("rejectedRowsCsv", () => {
  it("writes one line per rejection: its spreadsheet line, the reason, then the original cells", () => {
    const csv = rejectedRowsCsv(
      ["external_id", "age", "city"],
      [
        {
          rowNumber: 3,
          reason: "Age must be a number.",
          cells: ["CG-2", "old", "Dayton, OH"],
        },
        {
          rowNumber: 7,
          reason: "The identifier is blank.",
          cells: ["", "40", "Kent"],
        },
      ],
    );

    expect(readCsvRecords(csv)).toEqual([
      ["Line", "Reason", "external_id", "age", "city"],
      ["3", "Age must be a number.", "CG-2", "old", "Dayton, OH"],
      ["7", "The identifier is blank.", "", "40", "Kent"],
    ]);
  });

  it("names the file after the imported one, dated", () => {
    const at = new Date("2026-11-02T10:00:00Z");
    expect(rejectedRowsFileName("panel.csv", at)).toBe(
      "panel-rejected-rows-2026-11-02.csv",
    );
    expect(rejectedRowsFileName("export", at)).toBe(
      "export-rejected-rows-2026-11-02.csv",
    );
  });
});
