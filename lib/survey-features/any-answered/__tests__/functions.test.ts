import { SurveyModel } from "survey-core";
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

/** A survey of text questions; a name maps to whether its question is answered. */
function surveyWithQuestions(answered: Record<string, boolean>): SurveyModel {
  const names = Object.keys(answered);
  const survey = new SurveyModel({
    elements: names.map((name) => ({ type: "text", name })),
  });
  survey.data = Object.fromEntries(
    names.filter((name) => answered[name]).map((name) => [name, "answer"]),
  );
  return survey;
}

describe("anyAnsweredByPrefixFunction", () => {
  it("returns true when a matching-prefixed question is answered", () => {
    const survey = surveyWithQuestions({
      qAB101_C103_D_E4_F5: false,
      qAB101_C103_D_E4_F7: true,
      qAB101_Z001_D_E4_F17: true,
    });
    const result = anyAnsweredByPrefixFunction.call(
      { survey },
      ["qAB101_C103_D_E4"],
    );

    expect(result).toBe(true);
  });

  it("returns false when matching-prefixed questions are all empty", () => {
    const survey = surveyWithQuestions({
      qAB101_C103_D_E4_F5: false,
      qAB101_C103_D_E4_F7: false,
      qAB101_Z001_D_E4_F17: true,
    });
    const result = anyAnsweredByPrefixFunction.call(
      { survey },
      ["qAB101_C103_D_E4"],
    );

    expect(result).toBe(false);
  });

  it("returns false for missing prefix, empty prefix, and non-string prefix", () => {
    const survey = surveyWithQuestions({});
    expect(anyAnsweredByPrefixFunction.call({ survey }, [])).toBe(false);
    expect(anyAnsweredByPrefixFunction.call({ survey }, [""])).toBe(false);
    expect(anyAnsweredByPrefixFunction.call({ survey }, [123])).toBe(false);
    expect(anyAnsweredByPrefixFunction.call({}, ["q"])).toBe(false);
  });
});
