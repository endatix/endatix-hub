import { describe, expect, it } from "vitest";
import { pdfPlainText } from "../pdf-plain-text";

describe("pdfPlainText", () => {
  it("strips HTML tags", () => {
    expect(pdfPlainText("<span>Hello</span>")).toBe("Hello");
  });

  it("decodes entity-encoded tags then strips them", () => {
    expect(pdfPlainText("&lt;span&gt;Hello&lt;/span&gt;")).toBe("Hello");
  });

  it("decodes double-encoded tags then strips them", () => {
    expect(pdfPlainText("&amp;lt;span&amp;gt;Hello&amp;lt;/span&amp;gt;")).toBe(
      "Hello",
    );
  });

  it("decodes named entities beyond the markup-relevant set", () => {
    expect(pdfPlainText("&copy; 2026")).toBe("© 2026");
  });

  it("keeps a literal ampersand as-is", () => {
    expect(pdfPlainText("Q&A")).toBe("Q&A");
  });

  it("keeps a literal ampersand next to a stripped tag", () => {
    expect(pdfPlainText("<span>Q&A</span>")).toBe("Q&A");
  });

  it("turns literal \\n into a line break", () => {
    expect(pdfPlainText("line\\nline")).toBe("line\nline");
  });

  it("returns empty for nullish values", () => {
    expect(pdfPlainText(null)).toBe("");
    expect(pdfPlainText(undefined)).toBe("");
  });

  it("stringifies numbers and booleans without sanitizing", () => {
    expect(pdfPlainText(18)).toBe("18");
    expect(pdfPlainText(true)).toBe("true");
  });

  it("decodes named and numeric entities", () => {
    expect(pdfPlainText("A&nbsp;B")).toBe("A B");
    expect(pdfPlainText("&#39;quoted&#39;")).toBe("'quoted'");
  });

  it("drops out-of-range numeric entities instead of throwing", () => {
    expect(pdfPlainText("A&#1114112;B")).toBe("AB");
    expect(pdfPlainText("A&#x110000;B")).toBe("AB");
  });
});
