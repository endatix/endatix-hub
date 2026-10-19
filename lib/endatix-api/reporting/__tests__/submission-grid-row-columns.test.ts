import { describe, expect, it } from "vitest";
import {
  fitRowColumns,
  fitsRowColumns,
  MAX_SUBMISSION_GRID_COLUMNS_PARAM_BYTES,
  rowColumnsUsage,
} from "../submission-grid-row-columns";
import { MAX_SUBMISSION_GRID_ROW_COLUMNS } from "../submission-grid-types";

function encodedColumnsParam(keys: readonly string[]): number {
  return (
    new URLSearchParams({ columns: keys.join(",") }).toString().length -
    "columns=".length
  );
}

describe("fitRowColumns", () => {
  it("stops before the columns value outgrows the request line", () => {
    // Arrange
    const keys = Array.from(
      { length: 500 },
      (_, index) => `respondent_answer_${String(index).padStart(4, "0")}`,
    );

    // Act
    const fitted = fitRowColumns(keys);

    // Assert
    expect(fitted).toEqual(keys.slice(0, fitted.length));
    expect(encodedColumnsParam(fitted)).toBeLessThanOrEqual(
      MAX_SUBMISSION_GRID_COLUMNS_PARAM_BYTES,
    );
    expect(
      encodedColumnsParam(keys.slice(0, fitted.length + 1)),
    ).toBeGreaterThan(MAX_SUBMISSION_GRID_COLUMNS_PARAM_BYTES);
  });

  it("stops at the key count with short keys", () => {
    // Arrange
    const keys = Array.from({ length: 600 }, (_, index) => `q${index}`);

    // Act
    const fitted = fitRowColumns(keys);

    // Assert
    expect(fitted).toHaveLength(MAX_SUBMISSION_GRID_ROW_COLUMNS);
  });

  it("counts a key's encoded length, as the request writes it", () => {
    // Arrange
    const usage = rowColumnsUsage(["a b", "ü"]);

    // Act
    const bytes = encodedColumnsParam(["a b", "ü"]);

    // Assert
    expect(usage).toEqual({ count: 2, bytes });
  });

  it("tells whether one more key fits", () => {
    // Arrange
    const nearlyFull = rowColumnsUsage([
      "x".repeat(MAX_SUBMISSION_GRID_COLUMNS_PARAM_BYTES - 4),
    ]);

    // Act
    const short = fitsRowColumns(nearlyFull, "y");
    const long = fitsRowColumns(nearlyFull, "yy");

    // Assert
    expect([short, long]).toEqual([true, false]);
  });
});
