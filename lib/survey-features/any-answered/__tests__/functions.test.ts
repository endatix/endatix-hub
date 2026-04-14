import { describe, expect, it } from "vitest";
import {
  anyAnsweredByPrefixFunction,
  anyAnsweredFunction,
} from "../functions";

describe("anyAnsweredFunction", () => {
  it("returns true when any explicitly listed question is answered", () => {
    const result = anyAnsweredFunction(
      ["qAB101_C103_D_E4_F5", "qAB101_C103_D_E4_F7", "qAB101_Z001_D_E4_F17"],
      {
        qAB101_C103_D_E4_F5: [],
        qAB101_C103_D_E4_F7: "Item 1",
        qAB101_Z001_D_E4_F17: "",
      },
    );

    expect(result).toBe(true);
  });

  it("returns false when all explicitly listed question values are empty", () => {
    const result = anyAnsweredFunction(
      ["qAB101_C103_D_E4_F5", "qAB101_C103_D_E4_F7"],
      {
        qAB101_C103_D_E4_F5: [],
        qAB101_C103_D_E4_F7: "   ",
      },
    );

    expect(result).toBe(false);
  });

  it("returns false for empty params, unknown names, and non-string params", () => {
    expect(anyAnsweredFunction([], { q1: "x" })).toBe(false);
    expect(anyAnsweredFunction(["unknown"], { q1: "x" })).toBe(false);
    expect(anyAnsweredFunction([42, null], { q1: "x" })).toBe(false);
  });
});

describe("anyAnsweredByPrefixFunction", () => {
  it("returns true when a matching-prefixed question is answered", () => {
    const result = anyAnsweredByPrefixFunction(["qAB101_C103_D_E4"], {
      qAB101_C103_D_E4_F5: [],
      qAB101_C103_D_E4_F7: "Item 2",
      qAB101_Z001_D_E4_F17: "Item 1",
    });

    expect(result).toBe(true);
  });

  it("returns false when matching-prefixed questions are all empty", () => {
    const result = anyAnsweredByPrefixFunction(["qAB101_C103_D_E4"], {
      qAB101_C103_D_E4_F5: [],
      qAB101_C103_D_E4_F7: "",
      qAB101_Z001_D_E4_F17: "Item 1",
    });

    expect(result).toBe(false);
  });

  it("returns false for missing prefix, empty prefix, and non-string prefix", () => {
    expect(anyAnsweredByPrefixFunction([], { q1: "x" })).toBe(false);
    expect(anyAnsweredByPrefixFunction([""], { q1: "x" })).toBe(false);
    expect(anyAnsweredByPrefixFunction([123], { q1: "x" })).toBe(false);
  });
});
