import { describe, expect, it } from "vitest";
import { formatPdfCellValue } from "../format-pdf-cell-value";

describe("formatPdfCellValue", () => {
  it.each([
    [null, ""],
    [undefined, ""],
    ["", ""],
    ["yes", "yes"],
    ["<span>Hello</span>", "Hello"],
    ["line\\nline", "line\nline"],
    [3, "3"],
    [true, "true"],
    [["a", "b"], "a, b"],
    [["a", "", null], "a"],
    [{ code: "us" }, '{"code":"us"}'],
  ])("formats %j", (value, expected) => {
    // Act & Assert
    expect(formatPdfCellValue(value)).toBe(expected);
  });
});
