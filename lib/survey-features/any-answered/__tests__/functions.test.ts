import { describe, expect, it } from "vitest";
import {
  anyAnsweredByPrefixFunction,
  anyAnsweredFunction,
} from "../functions";

describe("anyAnsweredFunction", () => {
  it("returns true when any passed value is answered", () => {
    const result = anyAnsweredFunction([[], "Item 1", ""]);

    expect(result).toBe(true);
  });

  it("returns false when all passed values are empty", () => {
    const result = anyAnsweredFunction([[], "", null, undefined]);

    expect(result).toBe(false);
  });

  it("returns false for empty params and true for non-empty primitives", () => {
    expect(anyAnsweredFunction([])).toBe(false);
    expect(anyAnsweredFunction([42, null])).toBe(true);
  });
});

describe("anyAnsweredByPrefixFunction", () => {
  it("returns true when a matching-prefixed question is answered", () => {
    const survey = {
      getAllQuestions: () => [
        { name: "qAB101_C103_D_E4_F5", isEmpty: () => true },
        { name: "qAB101_C103_D_E4_F7", isEmpty: () => false },
        { name: "qAB101_Z001_D_E4_F17", isEmpty: () => false },
      ],
    };
    const result = anyAnsweredByPrefixFunction.call(
      { survey },
      ["qAB101_C103_D_E4"],
    );

    expect(result).toBe(true);
  });

  it("returns false when matching-prefixed questions are all empty", () => {
    const survey = {
      getAllQuestions: () => [
        { name: "qAB101_C103_D_E4_F5", isEmpty: () => true },
        { name: "qAB101_C103_D_E4_F7", isEmpty: () => true },
        { name: "qAB101_Z001_D_E4_F17", isEmpty: () => false },
      ],
    };
    const result = anyAnsweredByPrefixFunction.call(
      { survey },
      ["qAB101_C103_D_E4"],
    );

    expect(result).toBe(false);
  });

  it("returns false for missing prefix, empty prefix, and non-string prefix", () => {
    const survey = { getAllQuestions: () => [] };
    expect(anyAnsweredByPrefixFunction.call({ survey }, [])).toBe(false);
    expect(anyAnsweredByPrefixFunction.call({ survey }, [""])).toBe(false);
    expect(anyAnsweredByPrefixFunction.call({ survey }, [123])).toBe(false);
    expect(anyAnsweredByPrefixFunction.call({}, ["q"])).toBe(false);
  });
});
