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

  /**
   * The HTML spec resolves an out-of-range or invalid character reference to
   * U+FFFD, which is what browsers show. Keeping the replacement character
   * makes corrupt input visible instead of silently deleting it.
   */
  it("replaces out-of-range numeric entities rather than dropping them", () => {
    expect(pdfPlainText("A&#1114112;B")).toBe("A\uFFFDB");
    expect(pdfPlainText("A&#x110000;B")).toBe("A\uFFFDB");
  });

  it("renders object and array answers as JSON, not [object Object]", () => {
    expect(pdfPlainText({ a: 1 })).toBe('{"a":1}');
    expect(pdfPlainText([1, 2])).toBe("[1,2]");
  });

  /**
   * JSON.stringify is not total. A circular answer would otherwise throw and
   * fail the whole render, and a function would print its source into the PDF.
   */
  it("yields empty text for values that cannot be serialised", () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;

    expect(pdfPlainText(circular)).toBe("");
    expect(pdfPlainText(() => "secret")).toBe("");
  });

  it("does not print Error.message into the PDF", () => {
    expect(pdfPlainText(new Error("internal"))).toBe(
      "Cannot display this value",
    );
  });

  it("renders a bigint answer", () => {
    expect(pdfPlainText(BigInt(10))).toBe("10");
  });

  /** Lone surrogates cannot stand alone in text and would corrupt PDF output. */
  it("replaces lone surrogate references", () => {
    expect(pdfPlainText("A&#xD800;B")).toBe("A\uFFFDB");
  });
});
