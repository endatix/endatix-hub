import { parseBoolean, parseNumber } from "@/lib/utils/type-parsers";
import { describe, expect, it } from "vitest";

describe("parseBoolean", () => {
  it("should return false for undefined input", () => {
    expect(parseBoolean(undefined)).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(parseBoolean("")).toBe(false);
  });

  it("should return false for whitespace string", () => {
    expect(parseBoolean("   ")).toBe(false);
  });

  it('should return true for "true" (case-insensitive with or without whitespace)', () => {
    expect(parseBoolean("true")).toBe(true);
    expect(parseBoolean("TRUE")).toBe(true);
    expect(parseBoolean("True")).toBe(true);
    expect(parseBoolean("true ")).toBe(true);
    expect(parseBoolean(" true")).toBe(true);
    expect(parseBoolean(" true ")).toBe(true);
  });

  it('should return true for "1"', () => {
    expect(parseBoolean("1")).toBe(true);
    expect(parseBoolean("1 ")).toBe(true);
    expect(parseBoolean(" 1")).toBe(true);
    expect(parseBoolean(" 1 ")).toBe(true);
  });

  it("should return false for other string values", () => {
    expect(parseBoolean("yes")).toBe(false);
    expect(parseBoolean("on")).toBe(false);
    expect(parseBoolean("false")).toBe(false);
    expect(parseBoolean("0")).toBe(false);
    expect(parseBoolean("no")).toBe(false);
    expect(parseBoolean("off")).toBe(false);
  });
});

describe("parseNumber", () => {
  it("should return default (0) for undefined and null", () => {
    expect(parseNumber(undefined)).toBe(0);
    expect(parseNumber(null)).toBe(0);
  });

  it("should return default for empty string", () => {
    expect(parseNumber("")).toBe(0);
  });

  it("should return the number unchanged when given a number", () => {
    expect(parseNumber(42)).toBe(42);
    expect(parseNumber(0)).toBe(0);
    expect(parseNumber(-10)).toBe(-10);
    expect(parseNumber(3.14)).toBe(3.14);
  });

  it("should parse valid numeric strings", () => {
    expect(parseNumber("42")).toBe(42);
    expect(parseNumber("0")).toBe(0);
    expect(parseNumber("3.14")).toBe(3.14);
    expect(parseNumber("1004")).toBe(1004);
  });

  it("should return default for non-numeric strings", () => {
    expect(parseNumber("abc")).toBe(0);
    expect(parseNumber("not a number")).toBe(0);
  });

  it("should use custom defaultValue when parsing fails", () => {
    expect(parseNumber(undefined, 99)).toBe(99);
    expect(parseNumber(null, 99)).toBe(99);
    expect(parseNumber("", 99)).toBe(99);
    expect(parseNumber("invalid", 99)).toBe(99);
  });

  it("should use custom defaultValue for NaN from string", () => {
    expect(parseNumber("nope", -1)).toBe(-1);
  });
});
