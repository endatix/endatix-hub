import { describe, expect, it } from "vitest";
import {
  ItemValue,
  QuestionSelectBase,
  SurveyModel,
} from "survey-core";
import { SourceSelectionModes } from "@/lib/survey-features/question-loops/types";
import { getChoicesFromSourceQuestion } from "../get-choices-from-source-question";

/** SurveyJS keeps `selectedItemValues` protected; tests need the same access path as production. */
type LazyTagbox = QuestionSelectBase & {
  choicesLazyLoadEnabled?: boolean;
  selectedItemValues?: ItemValue | ItemValue[] | null;
};

describe("getChoicesFromSourceQuestion (lazy-load Selected Only)", () => {
  it("appends off-page selected values missing from visibleChoices", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "tagbox",
          name: "countries",
          choicesLazyLoadEnabled: true,
          choices: ["Algeria", "Jordan"],
        },
      ],
    });
    survey.setValue("countries", ["Jordan", "Mexico"]);
    const source = survey.getQuestionByName("countries") as LazyTagbox;

    const choices = getChoicesFromSourceQuestion(
      source,
      SourceSelectionModes.SelectedOnly,
    );

    expect(choices.map((item) => item.value)).toEqual(["Jordan", "Mexico"]);
  });

  it("prefers labeled selectedItemValues over ID-only visibleChoices", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "tagbox",
          name: "cities",
          choicesLazyLoadEnabled: true,
          choices: [
            { value: "3247449", text: "3247449" },
            { value: "1279186", text: "1279186" },
          ],
        },
      ],
    });
    const source = survey.getQuestionByName("cities") as LazyTagbox;
    survey.setValue("cities", ["3247449", "1279186"]);
    source.selectedItemValues = [
      source.createItemValue("3247449", "Aquisgrán"),
      source.createItemValue("1279186", "Aizawl"),
    ];

    const choices = getChoicesFromSourceQuestion(
      source,
      SourceSelectionModes.SelectedOnly,
    );

    expect(
      choices.map((item) => ({ value: item.value, text: item.text })),
    ).toEqual([
      { value: "3247449", text: "Aquisgrán" },
      { value: "1279186", text: "Aizawl" },
    ]);
  });

  it("does not replace a catalog-mapped visible choice with stale identity selectedItemValues", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "tagbox",
          name: "cities",
          choicesLazyLoadEnabled: true,
          choices: [{ value: "2510911", text: "Sevilla" }],
        },
      ],
    });
    const source = survey.getQuestionByName("cities") as LazyTagbox;
    survey.setValue("cities", ["2510911"]);
    // Mimic data-list search: visibleChoices carry a catalog locale map.
    source.visibleChoices[0]!.locText.setJson({
      default: "Seville",
      es: "Sevilla",
    });
    source.selectedItemValues = [source.createItemValue("2510911", "2510911")];

    const choices = getChoicesFromSourceQuestion(
      source,
      SourceSelectionModes.SelectedOnly,
    );

    expect(choices).toHaveLength(1);
    expect(choices[0]!.value).toBe("2510911");
    expect(choices[0]!.locText.getJson()).toEqual({
      default: "Seville",
      es: "Sevilla",
    });
  });
});
