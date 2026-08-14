import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Helpers, SurveyModel } from "survey-core";
import addRandomizeGroupFeature from "@/lib/questions/features/group-randomization";
import { registerDataListGlobals } from "@/lib/survey-features/data-lists/infrastructure/registry";
import { registerAdvancedCarryForwardGlobals } from "../infrastructure/registry";
import { syncSingleCarryForwardTarget } from "../use-cases/sync-carry-forward-target";
import type { AdvancedCarryForwardQuestion } from "../types";

type LazyTagbox = {
  createItemValue: (
    value: string,
    text?: string,
  ) => {
    value: string;
    text: string;
    locText?: { setJson: (json: unknown) => void };
  };
  selectedItemValues:
    | Array<{
        value: string;
        text: string;
        locText?: { setJson: (json: unknown) => void };
      }>
    | null
    | undefined;
};

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
    syncSingleCarryForwardTarget(survey, target);
    const choiceItemsAfterFirstSync = [...target.choices];

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert — setter may reuse the array; unchanged sync must keep item instances
    expect(target.choices).toHaveLength(choiceItemsAfterFirstSync.length);
    for (let i = 0; i < choiceItemsAfterFirstSync.length; i++) {
      expect(target.choices[i]).toBe(choiceItemsAfterFirstSync[i]);
    }
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

  it("keeps off-page lazy-load selections in Selected Only carry-forward", () => {
    // Arrange — source page only has Jordan; Mexico is selected but not loaded
    const survey = new SurveyModel({
      elements: [
        {
          type: "tagbox",
          name: "countries",
          choicesLazyLoadEnabled: true,
          choices: ["Algeria", "Jordan"],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["countries"],
          edxCarryForwardMode: "selected",
        },
      ],
    });
    survey.setValue("countries", ["Jordan", "Mexico"]);
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert — Mexico survives even though it was absent from visibleChoices
    expect(target.choices.map((item) => item.value)).toEqual([
      "Jordan",
      "Mexico",
    ]);
  });

  it("forces Selected contribution for lazy sources when mode is All", () => {
    // Arrange — visible page is Algeria/Jordan; only Mexico is selected (off-page)
    const survey = new SurveyModel({
      elements: [
        {
          type: "tagbox",
          name: "countries",
          choicesLazyLoadEnabled: true,
          choices: ["Algeria", "Jordan"],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["countries"],
          edxCarryForwardMode: "all",
        },
      ],
    });
    survey.setValue("countries", ["Mexico"]);
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert — does not copy the whole visible page as All would
    expect(target.choices.map((item) => item.value)).toEqual(["Mexico"]);
  });

  it("forces Selected contribution for lazy sources when mode is Unselected", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "tagbox",
          name: "countries",
          choicesLazyLoadEnabled: true,
          choices: ["Algeria", "Jordan"],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["countries"],
          edxCarryForwardMode: "unselected",
        },
      ],
    });
    survey.setValue("countries", ["Jordan", "Mexico"]);
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert — unselected page items (Algeria) are not carried; selected are
    expect(target.choices.map((item) => item.value)).toEqual([
      "Jordan",
      "Mexico",
    ]);
  });

  it("honors Unselected for inline sources while forcing Selected for lazy sources", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "inlineBrands",
          choices: ["A", "B", "C"],
        },
        {
          type: "tagbox",
          name: "lazyCountries",
          choicesLazyLoadEnabled: true,
          choices: ["Algeria", "Jordan"],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["inlineBrands", "lazyCountries"],
          edxCarryForwardMode: "unselected",
        },
      ],
    });
    survey.setValue("inlineBrands", ["A"]);
    survey.setValue("lazyCountries", ["Mexico"]);
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert — inline unselected B/C + lazy selected Mexico
    expect(target.choices.map((item) => item.value)).toEqual([
      "B",
      "C",
      "Mexico",
    ]);
  });

  it("honors All for inline sources while forcing Selected for lazy sources", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "inlineBrands",
          choices: ["A", "B", "C"],
        },
        {
          type: "tagbox",
          name: "lazyCountries",
          choicesLazyLoadEnabled: true,
          choices: ["Algeria", "Jordan"],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["inlineBrands", "lazyCountries"],
          edxCarryForwardMode: "all",
        },
      ],
    });
    survey.setValue("inlineBrands", ["A"]);
    survey.setValue("lazyCountries", ["Mexico"]);
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert — full inline catalog + lazy selected Mexico (not the lazy page)
    expect(target.choices.map((item) => item.value)).toEqual([
      "A",
      "B",
      "C",
      "Mexico",
    ]);
  });

  it("yields no choices for a lazy source in All mode when nothing is selected", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "tagbox",
          name: "countries",
          choicesLazyLoadEnabled: true,
          choices: ["Algeria", "Jordan"],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["countries"],
          edxCarryForwardMode: "all",
        },
      ],
    });
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert — does not copy the loaded page as All used to
    expect(target.choices.map((item) => item.value)).toEqual([]);
  });

  it("carries lazy-load selectedItemValues labels into Selected Only target", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "tagbox",
          name: "cities",
          choicesLazyLoadEnabled: true,
          choices: [],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["cities"],
          edxCarryForwardMode: "selected",
        },
      ],
    });
    const cities = survey.getQuestionByName("cities") as LazyTagbox;
    survey.setValue("cities", ["3247449", "1279186"]);
    cities.selectedItemValues = [
      cities.createItemValue("3247449", "Aquisgrán"),
      cities.createItemValue("1279186", "Aizawl"),
    ];

    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    syncSingleCarryForwardTarget(survey, target);

    expect(
      target.choices.map((item) => ({ value: item.value, text: item.text })),
    ).toEqual([
      { value: "3247449", text: "Aquisgrán" },
      { value: "1279186", text: "Aizawl" },
    ]);
  });

  it("does not keep visibleChoices ID text when selectedItemValues has labels", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "tagbox",
          name: "cities",
          choicesLazyLoadEnabled: true,
          choices: [{ value: "2510911", text: "2510911" }],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["cities"],
          edxCarryForwardMode: "selected",
        },
      ],
    });
    const cities = survey.getQuestionByName("cities") as LazyTagbox;
    survey.setValue("cities", ["2510911"]);
    cities.selectedItemValues = [cities.createItemValue("2510911", "Sevilla")];

    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    syncSingleCarryForwardTarget(survey, target);

    expect(target.choices).toHaveLength(1);
    expect(target.choices[0]?.value).toBe("2510911");
    expect(target.choices[0]?.text).toBe("Sevilla");
  });

  it("upgrades ID-only target choices when source labels resolve later", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "tagbox",
          name: "cities",
          choicesLazyLoadEnabled: true,
          choices: [],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["cities"],
          edxCarryForwardMode: "selected",
        },
      ],
    });
    const cities = survey.getQuestionByName("cities") as LazyTagbox;
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    survey.setValue("cities", ["2510911"]);
    // First sync — display values not ready yet
    syncSingleCarryForwardTarget(survey, target);
    expect(target.choices[0]?.text).toBe("2510911");

    cities.selectedItemValues = [cities.createItemValue("2510911", "Sevilla")];
    cities.selectedItemValues[0]!.locText?.setJson({
      default: "Seville",
      es: "Sevilla",
    });

    syncSingleCarryForwardTarget(survey, target);

    expect(target.choices[0]?.value).toBe("2510911");
    expect(target.choices[0]?.text).toBe("Seville");
    expect(target.choices[0]?.locText.getJson()).toEqual({
      default: "Seville",
      es: "Sevilla",
    });
  });

  it("does not downgrade resolved labels when a later sync only has ID fallbacks", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "tagbox",
          name: "cities",
          choicesLazyLoadEnabled: true,
          choices: [],
        },
        {
          type: "checkbox",
          name: "target",
          choices: ["legacy"],
          edxCarryForwardEnabled: true,
          edxCarryForwardSources: ["cities"],
          edxCarryForwardMode: "selected",
        },
      ],
    });
    const cities = survey.getQuestionByName("cities") as LazyTagbox;
    const target = survey.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    survey.setValue("cities", ["2510911"]);
    cities.selectedItemValues = [cities.createItemValue("2510911", "Sevilla")];
    syncSingleCarryForwardTarget(survey, target);
    expect(target.choices[0]?.text).toBe("Sevilla");

    // Later sync sees raw value only (selectedItemValues cleared / incomplete)
    cities.selectedItemValues = undefined;
    syncSingleCarryForwardTarget(survey, target);

    expect(target.choices[0]?.value).toBe("2510911");
    expect(target.choices[0]?.text).toBe("Sevilla");
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
