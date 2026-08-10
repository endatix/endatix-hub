import { describe, expect, it } from "vitest";
import { QuestionDropdownModel, QuestionTagboxModel } from "survey-core";
import {
  getQuestionSearchMode,
  mapSurveySearchModeToMatchMode,
} from "../map-survey-search-mode";

describe("mapSurveySearchModeToMatchMode", () => {
  it("maps startsWith to StartsWith", () => {
    expect(mapSurveySearchModeToMatchMode("startsWith")).toBe("StartsWith");
  });

  it("omits contains and unknown values so the API default applies", () => {
    expect(mapSurveySearchModeToMatchMode("contains")).toBeUndefined();
    expect(mapSurveySearchModeToMatchMode(undefined)).toBeUndefined();
    expect(mapSurveySearchModeToMatchMode(null)).toBeUndefined();
  });
});

describe("getQuestionSearchMode", () => {
  it("reads searchMode from dropdown and tagbox", () => {
    const dropdown = new QuestionDropdownModel("q1");
    dropdown.searchMode = "startsWith";
    expect(getQuestionSearchMode(dropdown)).toBe("startsWith");

    const tagbox = new QuestionTagboxModel("q2");
    tagbox.searchMode = "startsWith";
    expect(getQuestionSearchMode(tagbox)).toBe("startsWith");
  });

  it("defaults to contains", () => {
    const dropdown = new QuestionDropdownModel("q3");
    expect(getQuestionSearchMode(dropdown)).toBe("contains");
  });
});
