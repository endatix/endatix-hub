import { describe, expect, it } from "vitest";
import { formatMatrixDropdownCell } from "../format-matrix-dropdown-cell";

describe("formatMatrixDropdownCell", () => {
  it("pairs a display label with the stored choice value", () => {
    // Act & Assert
    expect(formatMatrixDropdownCell("us", "United States")).toBe(
      "United States (us)",
    );
  });

  it("uses the stored value when there is no display label", () => {
    // Act & Assert
    expect(formatMatrixDropdownCell("us", undefined)).toBe("us");
  });

  it("stringifies nested objects when there is no label", () => {
    // Act & Assert
    expect(formatMatrixDropdownCell({ code: "us" }, undefined)).toBe(
      '{"code":"us"}',
    );
  });
});
