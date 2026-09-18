import { describe, expect, it } from "vitest";
import {
  MATRIX_LABEL_COLUMN_WIDTH,
  MATRIX_MIN_DATA_COLUMN_WIDTH,
  MATRIX_TABLE_CONTENT_WIDTH,
  computeMatrixDataColumnWidth,
} from "../pdf-styles";

describe("computeMatrixDataColumnWidth", () => {
  it("divides the remaining width evenly across data columns", () => {
    // Act
    const width = computeMatrixDataColumnWidth(2);

    // Assert
    expect(width).toBe(
      (MATRIX_TABLE_CONTENT_WIDTH - MATRIX_LABEL_COLUMN_WIDTH) / 2,
    );
  });

  it("scales down as column count grows", () => {
    // Act & Assert — more columns must not stay at a fixed width.
    expect(computeMatrixDataColumnWidth(4)).toBeLessThan(
      computeMatrixDataColumnWidth(2)!,
    );
  });

  it("returns null once columns would drop below the legible minimum (stacked-layout fallback)", () => {
    // Arrange — enough columns that even width would fall under the minimum.
    const tooManyColumns = Math.ceil(
      (MATRIX_TABLE_CONTENT_WIDTH - MATRIX_LABEL_COLUMN_WIDTH) /
        MATRIX_MIN_DATA_COLUMN_WIDTH,
    ) + 1;

    // Act
    const width = computeMatrixDataColumnWidth(tooManyColumns);

    // Assert
    expect(width).toBeNull();
  });

  it("returns null for zero columns", () => {
    expect(computeMatrixDataColumnWidth(0)).toBeNull();
  });

  it("keeps a grid at five data columns and stacks at six", () => {
    // Act & Assert
    expect(computeMatrixDataColumnWidth(5)).toBe(
      (MATRIX_TABLE_CONTENT_WIDTH - MATRIX_LABEL_COLUMN_WIDTH) / 5,
    );
    expect(computeMatrixDataColumnWidth(6)).toBeNull();
  });
});
