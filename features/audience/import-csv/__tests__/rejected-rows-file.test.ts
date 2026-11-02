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

  it("names the file after the imported one", () => {
    expect(rejectedRowsFileName("panel.csv")).toBe("panel-rejected-rows.csv");
    expect(rejectedRowsFileName("export")).toBe("export-rejected-rows.csv");
  });
});
