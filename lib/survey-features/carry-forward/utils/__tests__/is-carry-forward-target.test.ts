import { describe, expect, it } from "vitest";
import { SurveyModel } from "survey-core";
import { registerAdvancedCarryForwardGlobals } from "../../infrastructure/registry";
import { isAdvancedCarryForwardEnabled } from "../is-carry-forward-target";

describe("isAdvancedCarryForwardEnabled", () => {
  it("returns true for an enabled select-base carry-forward target", () => {
    registerAdvancedCarryForwardGlobals();

    const survey = new SurveyModel({
      elements: [
        { type: "checkbox", name: "src", choices: ["A"] },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["src"],
        },
      ],
    });

    expect(
      isAdvancedCarryForwardEnabled(survey.getQuestionByName("target")),
    ).toBe(true);
  });

  it("returns false for non-select-base questions", () => {
    registerAdvancedCarryForwardGlobals();

    const survey = new SurveyModel({
      elements: [{ type: "text", name: "comment" }],
    });

    expect(
      isAdvancedCarryForwardEnabled(survey.getQuestionByName("comment")),
    ).toBe(false);
  });

  it("returns false when native choicesFromQuestion is configured", () => {
    registerAdvancedCarryForwardGlobals();

    const survey = new SurveyModel({
      elements: [
        { type: "checkbox", name: "src", choices: ["A"] },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["src"],
          choicesFromQuestion: "src",
        },
      ],
    });

    expect(
      isAdvancedCarryForwardEnabled(survey.getQuestionByName("target")),
    ).toBe(false);
  });

  it("returns false when carry forward is disabled", () => {
    registerAdvancedCarryForwardGlobals();

    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: false,
          edxCarryForwardSources: ["src"],
        },
      ],
    });

    expect(
      isAdvancedCarryForwardEnabled(survey.getQuestionByName("target")),
    ).toBe(false);
  });
});
