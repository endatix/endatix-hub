import { describe, expect, it } from "vitest";
import { pdfPlainText } from "../pdf-plain-text";

describe("pdfPlainText", () => {
  it("strips HTML tags", () => {
    expect(pdfPlainText("<span>Hello</span>")).toBe("Hello");
  });

  it("decodes entity-encoded tags then strips them", () => {
    expect(pdfPlainText("&lt;span&gt;Hello&lt;/span&gt;")).toBe("Hello");
  });

  it("turns literal \\n into a line break", () => {
    expect(pdfPlainText("line\\nline")).toBe("line\nline");
  });

  it("returns empty for nullish values", () => {
    expect(pdfPlainText(null)).toBe("");
    expect(pdfPlainText(undefined)).toBe("");
  });
});
