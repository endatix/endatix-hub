import { describe, it, expect } from "vitest";
import { getStringParam, getNumberParam } from "../expression-utils";

describe("getStringParam", () => {
  it("should return undefined for negative index", () => {
    expect(getStringParam(["hello", "world"], -1)).toBeUndefined();
  });

  it("should return string at valid index", () => {
    expect(getStringParam(["hello", "world"], 0)).toBe("hello");
    expect(getStringParam(["hello", "world"], 1)).toBe("world");
  });

  it("should return undefined for out of bounds index", () => {
    expect(getStringParam(["hello"], 5)).toBeUndefined();
    expect(getStringParam([], 0)).toBeUndefined();
  });

  it("should return undefined for non-string at index", () => {
    expect(getStringParam([123, "world"], 0)).toBeUndefined();
    expect(getStringParam([null, "world"], 0)).toBeUndefined();
    expect(getStringParam([undefined, "world"], 0)).toBeUndefined();
    expect(getStringParam([{}, "world"], 0)).toBeUndefined();
  });

  it("should return undefined for empty params array", () => {
    expect(getStringParam([], 0)).toBeUndefined();
  });

  it("should return undefined for non-array input", () => {
    expect(getStringParam("not array" as any, 0)).toBeUndefined();
    expect(getStringParam(null as any, 0)).toBeUndefined();
    expect(getStringParam(undefined as any, 0)).toBeUndefined();
  });
});

describe("getNumberParam", () => {
  it("should return number at valid index", () => {
    expect(getNumberParam([42, 100], 0)).toBe(42);
    expect(getNumberParam([42, 100], 1)).toBe(100);
  });

  it("should return undefined for out of bounds index", () => {
    expect(getNumberParam([42], 5)).toBeUndefined();
    expect(getNumberParam([], 0)).toBeUndefined();
  });

  it("should parse number strings", () => {
    expect(getNumberParam(["123", "456"], 0)).toBe(123);
    expect(getNumberParam(["3.14"], 0)).toBe(3.14);
  });

  it("should return undefined for non-parseable strings", () => {
    expect(getNumberParam(["abc"], 0)).toBeUndefined();
  });

  it("should handle booleans (true=1, false=0)", () => {
    expect(getNumberParam([true], 0)).toBe(1);
    expect(getNumberParam([false], 0)).toBe(0);
  });

  it("should return undefined for non-number at index", () => {
    expect(getNumberParam(["hello"], 0)).toBeUndefined();
    expect(getNumberParam([{}], 0)).toBeUndefined();
    expect(getNumberParam([[]], 0)).toBeUndefined();
  });

  it("should return undefined for empty params array", () => {
    expect(getNumberParam([], 0)).toBeUndefined();
  });

  it("should return undefined for non-array input", () => {
    expect(getNumberParam("not array" as any, 0)).toBeUndefined();
    expect(getNumberParam(null as any, 0)).toBeUndefined();
    expect(getNumberParam(undefined as any, 0)).toBeUndefined();
  });

  it("should handle negative numbers", () => {
    expect(getNumberParam([-100], 0)).toBe(-100);
    expect(getNumberParam(["-50"], 0)).toBe(-50);
  });

  it("should handle zero", () => {
    expect(getNumberParam([0], 0)).toBe(0);
    expect(getNumberParam(["0"], 0)).toBe(0);
  });
});
