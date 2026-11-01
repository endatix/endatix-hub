import { describe, expect, it } from "vitest";
import { outcomeCounts, rowCountLabel, sampleLabel } from "../import-labels";

describe("import labels", () => {
  it("names the counts that are not zero", () => {
    expect(
      outcomeCounts({
        writtenRowCount: 1_202,
        createdCount: 1_200,
        updatedCount: 0,
        skippedCount: 2,
        rejectedCount: 3,
      }),
    ).toBe(
      "1,200 added, 2 already on this form with nothing to change, 3 rejected",
    );
  });

  it("says a test import skipped the participants already here", () => {
    expect(
      outcomeCounts(
        {
          writtenRowCount: 3,
          createdCount: 1,
          updatedCount: 0,
          skippedCount: 2,
          rejectedCount: 0,
        },
        { asTest: true },
      ),
    ).toBe(
      "1 added as test participants, 2 skipped because they are already on this form",
    );
  });

  it("says rows and sample values in words", () => {
    expect(rowCountLabel(1)).toBe("1 row");
    expect(sampleLabel(["London, UK", "Leeds"])).toBe(
      "Values like London, UK · Leeds",
    );
    expect(sampleLabel([])).toMatch(/Empty/);
  });
});
