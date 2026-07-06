import { describe, expect, it, beforeAll } from "vitest";
import { ItemValue, SurveyModel } from "survey-core";
import { SourceSelectionModes } from "@/lib/survey-features/question-loops/types";
import { registerAdvancedCarryForwardGlobals } from "@/lib/survey-features/carry-forward/infrastructure/registry";
import { getChoicesFromSourceQuestion } from "@/lib/utils/survey";
import { normalizeChoiceKey } from "@/lib/utils/survey/choice-values";
import { extractUniqueChoicesBy } from "@/lib/utils/survey/merge-choices";

describe("normalizeChoiceKey", () => {
  it("coerces numeric and string values to the same key", () => {
    expect(normalizeChoiceKey(1)).toBe("1");
    expect(normalizeChoiceKey("1")).toBe("1");
  });
});

describe("getChoicesFromSourceQuestion", () => {
  it("reads from visibleChoices and skips built-in items", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "q1",
          choices: ["A", "B"],
          showNoneItem: true,
        },
      ],
    });
    const question = survey.getQuestionByName("q1")!;

    const choices = getChoicesFromSourceQuestion(
      question as never,
      SourceSelectionModes.All,
    );

    expect(choices.map((c) => c.value)).toEqual(["A", "B"]);
  });

  it("returns selected choices only in Selected Only mode", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "q1",
          choices: ["A", "B", "C"],
        },
      ],
    });
    const question = survey.getQuestionByName("q1")!;
    survey.setValue("q1", ["A", "C"]);

    const choices = getChoicesFromSourceQuestion(
      question as never,
      SourceSelectionModes.SelectedOnly,
    );

    expect(choices.map((c) => c.value)).toEqual(["A", "C"]);
  });
});

describe("extractUniqueChoicesBy", () => {
  it("deduplicates by normalized choice key", () => {
    const survey = new SurveyModel({
      elements: [
        { type: "checkbox", name: "q1", choices: [1, "B"] },
        { type: "checkbox", name: "q2", choices: ["1", "C"] },
      ],
    });
    const q1 = survey.getQuestionByName("q1") as never;
    const q2 = survey.getQuestionByName("q2") as never;

    const merged = extractUniqueChoicesBy(
      [q1, q2],
      (q) => q.choices as ItemValue[],
    );

    expect(merged.map((c) => c.value)).toEqual([1, "B", "C"]);
  });
});

describe("extractUniqueChoicesBy media", () => {
  beforeAll(() => {
    registerAdvancedCarryForwardGlobals();
  });

  it("preserves imageLink after carry-forward globals are registered", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "imagepicker",
          name: "src",
          choices: [{ value: "img1", imageLink: "https://example.com/1.png" }],
        },
        {
          type: "imagepicker",
          name: "target",
          choices: [],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ["src"],
        },
      ],
    });
    const src = survey.getQuestionByName("src") as never;
    const merged = extractUniqueChoicesBy([src], (question) =>
      getChoicesFromSourceQuestion(question, SourceSelectionModes.All),
    );
    expect(merged[0]?.imageLink).toBe("https://example.com/1.png");
  });
});
