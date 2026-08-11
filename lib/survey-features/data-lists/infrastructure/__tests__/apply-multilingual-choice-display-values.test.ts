import { describe, expect, it, vi } from "vitest";
import { Model, QuestionDropdownModel } from "survey-core";
import { applyMultilingualChoiceDisplayValues } from "../apply-multilingual-choice-display-values";

type SelectedChoiceItem = {
  text: string;
  value?: unknown;
  locText: { getJson: () => Record<string, string> };
};

/** SurveyJS keeps `selectedItemValues` protected; tests need the same access path as production. */
type SelectBaseQuestion = QuestionDropdownModel & {
  selectedItemValues: SelectedChoiceItem[];
};

describe("applyMultilingualChoiceDisplayValues", () => {
  it("passes flat labels to setItems then stamps full locale maps on selected items", () => {
    const model = new Model({
      locale: "bg",
      pages: [
        {
          elements: [
            {
              type: "tagbox",
              name: "cities",
              choicesLazyLoadEnabled: true,
            },
          ],
        },
      ],
    });
    model.locale = "bg";

    const question = model.getQuestionByName("cities") as SelectBaseQuestion;
    const setItems = vi.fn((displayValues: string[]) => {
      question.selectedItemValues = displayValues.map((text, index) =>
        question.createItemValue(["728193", "727011"][index], text),
      ) as SelectedChoiceItem[];
    });

    applyMultilingualChoiceDisplayValues(
      question,
      ["728193", "727011"],
      new Map([
        ["728193", { default: "Plovdiv", bg: "Пловдив" }],
        ["727011", { default: "Sofia", bg: "София" }],
      ]),
      setItems,
      "bg",
    );

    expect(setItems).toHaveBeenCalledWith(["Пловдив", "София"]);

    const selected = question.selectedItemValues;

    expect(selected[0].locText.getJson()).toEqual({
      default: "Plovdiv",
      bg: "Пловдив",
    });
    expect(selected[1].locText.getJson()).toEqual({
      default: "Sofia",
      bg: "София",
    });

    model.locale = "";
    expect(selected.map((item: SelectedChoiceItem) => item.text)).toEqual([
      "Plovdiv",
      "Sofia",
    ]);

    model.locale = "bg";
    expect(selected.map((item: SelectedChoiceItem) => item.text)).toEqual([
      "Пловдив",
      "София",
    ]);
  });
});
