import { describe, expect, it } from "vitest";
import { packPdfImageRows } from "../pack-pdf-image-rows";

describe("packPdfImageRows", () => {
  it("puts two portraits on one row and a wide image on its own", () => {
    // Arrange
    const ratios = [9 / 16, 3 / 4, 16 / 9, 3 / 1];

    // Act
    const rows = packPdfImageRows(ratios);

    // Assert
    expect(rows).toHaveLength(3);
    expect(rows[0].map((slot) => slot.index)).toEqual([0, 1]);
    expect(rows[1]).toHaveLength(1);
    expect(rows[2]).toHaveLength(1);

    for (const row of rows) {
      for (const slot of row) {
        expect(slot.width / slot.height).toBeCloseTo(ratios[slot.index], 1);
      }
    }
  });

  it("keeps a single portrait from stretching to the page width", () => {
    // Act
    const [row] = packPdfImageRows([9 / 16]);

    // Assert
    expect(row[0].width).toBeLessThan(row[0].height);
    expect(row[0].height).toBeLessThanOrEqual(200);
  });
});