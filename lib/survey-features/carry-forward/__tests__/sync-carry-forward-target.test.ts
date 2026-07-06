import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Helpers, SurveyModel } from "survey-core";
import addRandomizeGroupFeature from "@/lib/questions/features/group-randomization";
import { registerDataListGlobals } from "@/lib/survey-features/data-lists/infrastructure/registry";
import { registerAdvancedCarryForwardGlobals } from "../infrastructure/registry";
import { syncSingleCarryForwardTarget } from "../use-cases/sync-carry-forward-target";
import type { AdvancedCarryForwardQuestion } from "../types";

beforeAll(() => {
  registerAdvancedCarryForwardGlobals();
  registerDataListGlobals();
  addRandomizeGroupFeature();
});

describe("syncSingleCarryForwardTarget", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("aggregates and deduplicates choices from multiple sources in All mode", () => {
    // Arrange
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "brands",
          choices: ["A", "B"],
        },
        {
          type: "radiogroup",
          name: "colors",
          choices: ["B", "Red"],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["brands", "colors"],
          edxCarryForwardMode: "all",
        },
      ],
    });
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert
    expect(target.choices.map((item) => item.value)).toEqual(["A", "B", "Red"]);
  });

  it("uses Selected Only mode per source question", () => {
    // Arrange
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "brands",
          choices: ["A", "B", "C"],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["brands"],
          edxCarryForwardMode: "selected",
        },
      ],
    });
    survey.setValue("brands", ["A", "C"]);
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert
    expect(target.choices.map((item) => item.value)).toEqual(["A", "C"]);
  });

  it("uses Unselected Only mode per source question", () => {
    // Arrange
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "brands",
          choices: ["A", "B", "C"],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["brands"],
          edxCarryForwardMode: "unselected",
        },
      ],
    });
    survey.setValue("brands", ["A"]);
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert
    expect(target.choices.map((item) => item.value)).toEqual(["B", "C"]);
  });

  it("places priority choices first and marks them for group randomization", () => {
    // Arrange
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "brands",
          choices: ["A", "B", "C"],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          choicesOrder: "random",
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["brands"],
          edxCarryForwardPriorityItems: ["C", "A"],
        },
      ],
    });
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert
    expect(target.choices.map((item) => item.value)).toEqual(["C", "A", "B"]);
    expect(target.choices[0].group).toBe("priority");
    expect(target.choices[0].randomize).toBe(false);
    expect(target.choices[1].group).toBe("priority");
    expect(target.choices[2].group).toBeUndefined();
  });

  it("limits carried-forward choices when max choices is set", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "brands",
          choices: ["A", "B", "C", "D"],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["brands"],
          edxCarryForwardPriorityItems: ["D"],
          edxCarryForwardMaxChoices: 2,
        },
      ],
    });
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    syncSingleCarryForwardTarget(survey, target);

    expect(target.choices.map((item) => item.value)).toEqual(["D", "A"]);
  });

  it("keeps priority choices at the front after render-time randomization", () => {
    // Arrange
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "brands",
          choices: ["A", "B", "C", "D"],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          choicesOrder: "random",
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["brands"],
          edxCarryForwardPriorityItems: ["A"],
        },
      ],
    });
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;
    syncSingleCarryForwardTarget(survey, target);

    // Act & Assert
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const randomized = Helpers.randomizeArray([...target.choices]);
      expect(randomized[0].value).toBe("A");
    }
  });

  it("skips choice writes when aggregated choices are unchanged", () => {
    // Arrange
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "brands",
          choices: ["A", "B"],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["A", "B"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["brands"],
        },
      ],
    });
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;
    const isArraysEqualSpy = vi.spyOn(Helpers, "isArraysEqual");
    syncSingleCarryForwardTarget(survey, target);
    const callCountAfterFirstSync = isArraysEqualSpy.mock.calls.length;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert
    expect(isArraysEqualSpy.mock.calls.length).toBe(
      callCountAfterFirstSync + 1,
    );
    isArraysEqualSpy.mockRestore();
  });

  it("prunes invalid selected values when choices shrink", () => {
    // Arrange
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "brands",
          choices: ["A", "B", "C"],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          value: ["legacy", "A"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["brands"],
          edxCarryForwardMode: "selected",
        },
      ],
    });
    survey.setValue("brands", ["A"]);
    survey.setValue("target", ["legacy", "A"]);
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert
    expect(target.choices.map((item) => item.value)).toEqual(["A"]);
    expect(Array.from(target.value as string[])).toEqual(["A"]);
  });

  it("preserves None and Other selections when choices resync", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "brands",
          choices: ["A", "B", "C"],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          hasNone: true,
          hasOther: true,
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["brands"],
          edxCarryForwardMode: "selected",
        },
      ],
    });
    survey.setValue("brands", ["A", "B"]);
    survey.setValue("target", ["none", "other", "A"]);
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    syncSingleCarryForwardTarget(survey, target);

    expect(target.choices.map((item) => item.value)).toEqual(["A", "B"]);
    expect(Array.from(target.value as string[])).toEqual([
      "none",
      "other",
      "A",
    ]);
  });

  it("preserves Other selection on single-value questions when choices resync", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "brands",
          choices: ["A", "B"],
        },
        {
          type: "radiogroup",
          name: "target",
          choices: ["legacy"],
          hasOther: true,
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["brands"],
        },
      ],
    });
    survey.setValue("target", "other");
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    syncSingleCarryForwardTarget(survey, target);

    expect(target.choices.map((item) => item.value)).toEqual(["A", "B"]);
    expect(target.value).toBe("other");
  });

  it("preserves imageLink when copying to imagepicker targets", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "imagepicker",
          name: "src",
          choices: [
            {
              value: "img1",
              text: "Image 1",
              imageLink: "https://example.com/1.png",
            },
          ],
        },
        {
          type: "imagepicker",
          name: "target",
          choices: [],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["src"],
        },
      ],
    });
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    syncSingleCarryForwardTarget(survey, target);

    expect(target.choices[0]?.imageLink).toBe("https://example.com/1.png");
  });

  it("deduplicates type-different but string-equal values and keeps the first source image", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "imagepicker",
          name: "numericSrc",
          choices: [
            {
              value: 1,
              text: "Numeric",
              imageLink: "https://example.com/numeric.png",
            },
          ],
        },
        {
          type: "imagepicker",
          name: "stringSrc",
          choices: [
            {
              value: "1",
              text: "String",
              imageLink: "https://example.com/string.png",
            },
          ],
        },
        {
          type: "imagepicker",
          name: "target",
          choices: [],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["numericSrc", "stringSrc"],
        },
      ],
    });
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    syncSingleCarryForwardTarget(survey, target);

    expect(target.choices).toHaveLength(1);
    expect(target.choices[0]?.imageLink).toBe(
      "https://example.com/numeric.png",
    );
  });

  it("skips sync when data list is also configured on the same question", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "src",
          choices: ["A", "B"],
        },
        {
          type: "dropdown",
          name: "target",
          choices: ["legacy"],
          edxDataListId: "list-1",
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["src"],
        },
      ],
    });
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    syncSingleCarryForwardTarget(survey, target);

    expect(target.choices.map((item) => item.value)).toEqual(["legacy"]);
  });

  it("works on tagbox with blind search enabled without errors", () => {
    // Arrange
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "brands",
          choices: ["A", "B"],
          value: ["A", "B"],
        },
        {
          type: "tagbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["brands"],
          edxHideUntilTyping: true,
          edxMinSearchLength: 2,
        },
      ],
    });
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    // Act & Assert
    expect(() => syncSingleCarryForwardTarget(survey, target)).not.toThrow();
    expect(target.choices.map((item) => item.value)).toEqual(["A", "B"]);
  });
});
