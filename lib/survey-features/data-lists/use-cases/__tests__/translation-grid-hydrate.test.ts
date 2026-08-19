import { describe, expect, it } from "vitest";
import { ItemValue, SurveyModel } from "survey-core";
import { DATA_LIST_PROPERTY_NAME } from "../../constants";
import { registerDataListGlobals } from "../../infrastructure/registry";
import { buildItemValuesFromCatalog } from "../catalog-to-item-values";
import {
  hydrateTranslationGridFromCatalogs,
  stripTranslationGridHydrate,
} from "../translation-grid-hydrate";
import type { DataListTranslationCatalog } from "../surveyjs-translation-csv";

function createBoundDropdownSurvey(dataListId: string): SurveyModel {
  registerDataListGlobals();
  const survey = new SurveyModel({
    pages: [
      {
        name: "page1",
        elements: [
          {
            type: "dropdown",
            name: "questionCities",
            [DATA_LIST_PROPERTY_NAME]: dataListId,
            choices: [],
            choicesLazyLoadEnabled: true,
          },
        ],
      },
    ],
  });

  return survey;
}

describe("buildItemValuesFromCatalog", () => {
  it("maps default and culture labels onto ItemValue locText", () => {
    const catalog: DataListTranslationCatalog = {
      dataListId: "7",
      availableLocales: ["bg"],
      items: [{ value: "sofia", labels: { default: "Sofia", bg: "София" } }],
    };

    const { choices } = buildItemValuesFromCatalog(catalog);

    expect(choices).toHaveLength(1);
    expect(choices[0]).toBeInstanceOf(ItemValue);
    expect(choices[0].value).toBe("sofia");
    expect(choices[0].text).toBe("Sofia");
    expect(choices[0].locText.getLocaleText("bg")).toBe("София");
  });
});

describe("translation grid hydrate", () => {
  it("hydrates bound question choices then strips them on leave", () => {
    const survey = createBoundDropdownSurvey("42");
    const question = survey.getQuestionByName("questionCities")!;
    const catalog: DataListTranslationCatalog = {
      dataListId: "42",
      availableLocales: [],
      items: [{ value: "a", labels: { default: "Alpha" } }],
    };

    hydrateTranslationGridFromCatalogs(survey, new Map([["42", catalog]]));

    expect(question.choices).toHaveLength(1);
    expect(question.choices[0].text).toBe("Alpha");
    expect((question as Record<string, unknown>).choicesLazyLoadEnabled).toBe(
      false,
    );

    stripTranslationGridHydrate(survey);

    expect(question.choices).toHaveLength(0);
    expect((question as Record<string, unknown>).choicesLazyLoadEnabled).toBe(
      true,
    );
  });
});
