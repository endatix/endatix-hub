import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseUrl, parseNumericId, parseHeightMode } from "../embed";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseUrl", () => {
  it("returns null for empty string", () => {
    expect(parseUrl("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseUrl("   ")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(parseUrl(null as unknown as string)).toBeNull();
    expect(parseUrl(undefined as unknown as string)).toBeNull();
  });

  it("returns null for invalid URL format", () => {
    expect(parseUrl("not-a-url")).toBeNull();
    expect(parseUrl("://example.com")).toBeNull();
  });

  it("returns null for non-http protocols", () => {
    expect(parseUrl("ftp://example.com")).toBeNull();
    expect(parseUrl("file://localhost/file.txt")).toBeNull();
    expect(parseUrl("javascript:alert(1)")).toBeNull();
  });

  it("returns URL object for valid http URL", () => {
    const result = parseUrl("http://example.com");
    expect(result).not.toBeNull();
    expect(result?.protocol).toBe("http:");
    expect(result?.host).toBe("example.com");
  });

  it("returns URL object for valid https URL", () => {
    const result = parseUrl("https://example.com/path?query=1");
    expect(result).not.toBeNull();
    expect(result?.protocol).toBe("https:");
    expect(result?.host).toBe("example.com");
    expect(result?.pathname).toBe("/path");
    expect(result?.search).toBe("?query=1");
  });
});

describe("parseNumericId", () => {
  it("returns error for missing paramName", () => {
    const result = parseNumericId("123", "");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("paramName must be a non-empty string");
  });

  it("returns error for non-string paramName", () => {
    const result = parseNumericId("123", null as unknown as string);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("paramName must be a non-empty string");
  });

  it("returns error for missing idString", () => {
    const result = parseNumericId("", "formId");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("formId must be a non-empty string");
  });

  it("returns error for non-string idString", () => {
    const result = parseNumericId(null as unknown as string, "formId");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("formId must be a non-empty string");
  });

  it("returns error for non-numeric string", () => {
    const result = parseNumericId("abc", "formId");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("formId must be a valid numeric value");
  });

  it("returns error for zero", () => {
    const result = parseNumericId("0", "formId");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("must be a positive number");
  });

  it("returns error for negative number", () => {
    const result = parseNumericId("-1", "formId");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("must be a positive number");
  });

  it("returns error for number exceeding max safe integer", () => {
    const result = parseNumericId("9223372036854775808", "formId");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("must be a positive number and less than");
  });

  it("returns valid for valid positive integer", () => {
    const result = parseNumericId("1234567890", "formId");
    expect(result.isValid).toBe(true);
    expect(result.id).toBe(BigInt(1234567890));
    expect(result.error).toBeNull();
  });

  it("returns valid for maximum safe integer", () => {
    const result = parseNumericId("9223372036854775807", "formId");
    expect(result.isValid).toBe(true);
    expect(result.id).toBe(BigInt("9223372036854775807"));
  });

  it("handles large but valid numbers", () => {
    const result = parseNumericId("1000000000000000000", "formId");
    expect(result.isValid).toBe(true);
    expect(result.id).toBe(BigInt("1000000000000000000"));
  });
});

describe("parseHeightMode", () => {
  it("returns auto for undefined", () => {
    expect(parseHeightMode(undefined)).toBe("auto");
  });

  it("returns auto for an empty string", () => {
    expect(parseHeightMode("")).toBe("auto");
  });

  it("returns auto for the literal auto value", () => {
    expect(parseHeightMode("auto")).toBe("auto");
  });

  it("returns fill for the literal fill value", () => {
    expect(parseHeightMode("fill")).toBe("fill");
  });

  it("trims whitespace around a valid value", () => {
    expect(parseHeightMode("  fill  ")).toBe("fill");
  });

  it("returns auto and warns for an invalid value", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const result = parseHeightMode("bogus");

    expect(result).toBe("auto");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid data-height-mode value "bogus"'),
    );
  });

  it("returns auto without warning for an invalid value when warn is false", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const result = parseHeightMode("bogus", false);

    expect(result).toBe("auto");
    expect(warn).not.toHaveBeenCalled();
  });
});
