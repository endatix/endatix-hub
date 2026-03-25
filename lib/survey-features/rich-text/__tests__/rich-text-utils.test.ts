import { describe, expect, it } from "vitest";
import { normalizeWhitespace, unwrapSingleParagraph } from "../rich-text-utils";

describe("normalizeWhitespace", () => {
  it("should return empty string for empty string", () => {
    const value = "";
    const result = normalizeWhitespace(value);
    expect(result).toBe("");
  });

  it("should return empty string for null", () => {
    const value = null as unknown as string;
    const result = normalizeWhitespace(value);
    expect(result).toBe("");
  });

  it("should return empty string for undefined", () => {
    const value = undefined as unknown as string;
    const result = normalizeWhitespace(value);
    expect(result).toBe("");
  });

  it("should return trimmed text for normal string", () => {
    const value = "  hello world  ";
    const result = normalizeWhitespace(value);
    expect(result).toBe("hello world");
  });

  it("should replace non-breaking spaces with regular spaces", () => {
    const value = "hello\u00A0world";
    const result = normalizeWhitespace(value);
    expect(result).toBe("hello world");
  });

  it("should replace HTML non-breaking spaces with regular spaces", () => {
    const value = "hello&nbsp;world";
    const result = normalizeWhitespace(value);
    expect(result).toBe("hello world");
  });

  it("should replace multiple non-breaking spaces", () => {
    const value = "hello\u00A0\u00A0world";
    const result = normalizeWhitespace(value);
    expect(result).toBe("hello  world");
  });

  it("should handle non-breaking spaces and trim together", () => {
    const value = "\u00A0  hello world  \u00A0";
    const result = normalizeWhitespace(value);
    expect(result).toBe("hello world");
  });
});

describe("unwrapSingleParagraph", () => {
  it("should return empty string for empty string", () => {
    const value = "";
    const result = unwrapSingleParagraph(value);
    expect(result).toBe("");
  });

  it("should return empty string for null", () => {
    const value = null as unknown as string;
    const result = unwrapSingleParagraph(value);
    expect(result).toBe("");
  });

  it("should return empty string for undefined", () => {
    const value = undefined as unknown as string;
    const result = unwrapSingleParagraph(value);
    expect(result).toBe("");
  });

  it("should unwrap single paragraph and trim content", () => {
    const value = "<p>Simple text</p>";
    const result = unwrapSingleParagraph(value);
    expect(result).toBe("Simple text");
  });

  it("should unwrap paragraph with nested formatting tags", () => {
    const value = "<p><strong>Bold text</strong></p>";
    const result = unwrapSingleParagraph(value);
    expect(result).toBe("<strong>Bold text</strong>");
  });

  it("should unwrap paragraph with mixed formatting", () => {
    const value = "<p>Hello <strong>world</strong> and <em>universe</em></p>";
    const result = unwrapSingleParagraph(value);
    expect(result).toBe("Hello <strong>world</strong> and <em>universe</em>");
  });

  it("should return original text for multi-paragraph content", () => {
    const value = "<p>First</p><p>Second</p>";
    const result = unwrapSingleParagraph(value);
    expect(result).toBe(value);
  });

  it("should return original text when not wrapped in paragraph tags", () => {
    const value = "Just plain text";
    const result = unwrapSingleParagraph(value);
    expect(result).toBe("Just plain text");
  });

  it("should handle self-closing tags in paragraph", () => {
    const value = "<p>Text with <br/> line break</p>";
    const result = unwrapSingleParagraph(value);
    expect(result).toBe("Text with <br/> line break");
  });

  it("should handle paragraph with links", () => {
    const value = "<p>Visit <a href='https://example.com'>this link</a></p>";
    const result = unwrapSingleParagraph(value);
    expect(result).toBe("Visit <a href='https://example.com'>this link</a>");
  });

  it("should be case insensitive for p tag", () => {
    const value = "<P>Uppercase tags</P>";
    const result = unwrapSingleParagraph(value);
    expect(result).toBe("Uppercase tags");
  });

  it("should trim whitespace when unwrapping", () => {
    const value = "<p>  trimmed content  </p>";
    const result = unwrapSingleParagraph(value);
    expect(result).toBe("trimmed content");
  });
});
