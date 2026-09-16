import { describe, expect, it } from "vitest";
import { formatMatrixDropdownCell } from "../format-matrix-dropdown-cell";

describe("formatMatrixDropdownCell", () => {
  it("uses SurveyJS display text with the stored value", () => {
    // Arrange
    const row = {
      getQuestionByColumnName: () => ({ displayValue: "United States" }),
    };

    // Act & Assert
    expect(formatMatrixDropdownCell(row, "country", "us")).toBe(
      "United States (us)",
    );
  });

  it("falls back to the stored value when there is no cell question", () => {
    // Act & Assert
    expect(formatMatrixDropdownCell({}, "country", "us")).toBe("us");
  });

  it("stringifies nested objects when there is no label", () => {
    // Act & Assert
    expect(formatMatrixDropdownCell({}, "meta", { code: "us" })).toBe(
      '{"code":"us"}',
    );
  });
});
