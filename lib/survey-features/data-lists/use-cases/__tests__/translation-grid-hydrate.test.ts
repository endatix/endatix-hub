import { describe, expect, it, vi } from "vitest";
import { SurveyModel, type PanelModel } from "survey-core";
import { Translation } from "survey-creator-core";
import { DATA_LIST_PROPERTY_NAME } from "../../constants";
import { registerDataListGlobals } from "../../infrastructure/registry";
import {
  DATA_LIST_LOCALE_NOT_TRANSLATED,
  DATA_LIST_LOCALE_TRANSLATED,
} from "../data-list-translation-group-header";
import {
  DATA_LIST_HEADER_GROUP_PREFIX,
  bindAddLocalePlaceholderRefresh,
  injectDataListTranslationSummaries,
} from "../translation-grid-hydrate";
import type { DataListTranslationCatalog } from "../surveyjs-translation-csv";

function createBoundDropdownSurvey(dataListId: string): SurveyModel {
  registerDataListGlobals();
  return new SurveyModel({
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
}

const catalog: DataListTranslationCatalog = {
  dataListId: "42",
  name: "World cities",
  itemsCount: 1200,
  availableLocales: ["bg"],
  items: [{ value: "a", labels: { default: "Alpha", bg: "Алфа" } }],
};

function createCreator(
  survey: SurveyModel,
  translation: Translation,
  visibilityFire = vi.fn(),
) {
  return {
    survey,
    getPlugin: () => ({ model: translation }),
    onTranslationStringVisibility: { fire: visibilityFire },
  };
}

function getSummaryMatrix(translation: Translation) {
  const header = translation.stringsSurvey
    ?.getAllPanels()
    .find((panel) => panel.name === `${DATA_LIST_HEADER_GROUP_PREFIX}42`) as
    | PanelModel
    | undefined;
  const matrix = header?.questions.find(
    (question) => question.getType() === "matrixdropdown",
  ) as
    | {
        columns: Array<{ name: string; readOnly: boolean }>;
        rows: Array<{
          value: string;
          text: string;
          translationData: { getPlaceholder: (locale: string) => string };
        }>;
        visibleRows: Array<{
          cells: Array<{ question: { placeholder: string } }>;
        }>;
        isEmpty: () => boolean;
      }
    | undefined;

  return { header, matrix };
}

describe("translation grid data-list summaries", () => {
  it("does not hydrate bound question choices", () => {
    const survey = createBoundDropdownSurvey("42");
    const translation = new Translation(survey);
    translation.reset();

    injectDataListTranslationSummaries(
      createCreator(survey, translation) as never,
      new Map([["42", catalog]]),
    );

    expect(survey.getQuestionByName("questionCities")!.choices).toHaveLength(0);
  });

  it("adds locale columns on the live summary matrix so placeholders exist on first load", () => {
    const survey = createBoundDropdownSurvey("42");
    const translation = new Translation(survey);
    translation.reset();
    translation.addLocale("bg");
    translation.addLocale("de");

    injectDataListTranslationSummaries(
      createCreator(survey, translation) as never,
      new Map([["42", catalog]]),
    );

    const { header, matrix } = getSummaryMatrix(translation);
    expect(header?.title).toBe(
      `World cities (${(1200).toLocaleString()} items)`,
    );
    expect(matrix).toBeDefined();
    expect(matrix?.rows[0].value).toBe("choices");
    expect(matrix?.rows[0].text).toBe("Choices");
    expect(matrix?.rows[0].translationData.getPlaceholder("default")).toBe(
      DATA_LIST_LOCALE_TRANSLATED,
    );
    expect(matrix?.rows[0].translationData.getPlaceholder("bg")).toBe(
      DATA_LIST_LOCALE_TRANSLATED,
    );
    expect(matrix?.rows[0].translationData.getPlaceholder("de")).toBe(
      DATA_LIST_LOCALE_NOT_TRANSLATED,
    );
    expect(matrix?.columns.map((column) => column.name)).toEqual([
      "default",
      "bg",
      "de",
    ]);
    expect(matrix?.isEmpty()).toBe(true);
    expect(
      matrix?.visibleRows[0]?.cells.map((cell) => cell.question.placeholder),
    ).toEqual([
      DATA_LIST_LOCALE_TRANSLATED,
      DATA_LIST_LOCALE_TRANSLATED,
      DATA_LIST_LOCALE_NOT_TRANSLATED,
    ]);

    injectDataListTranslationSummaries(
      createCreator(survey, translation) as never,
      new Map([["42", catalog]]),
    );

    expect(
      translation.stringsSurvey
        ?.getAllPanels()
        .filter((panel) => panel.name === `${DATA_LIST_HEADER_GROUP_PREFIX}42`),
    ).toHaveLength(1);

    expect(() => {
      translation.stringsSurvey?.getAllQuestions().forEach((question) => {
        const withLifecycle = question as unknown as {
          beginUpdate: () => void;
          endUpdate: () => void;
        };
        withLifecycle.beginUpdate();
        withLifecycle.endUpdate();
      });
    }).not.toThrow();
  });

  it("picks up locale columns after a language is added", () => {
    const survey = createBoundDropdownSurvey("42");
    const translation = new Translation(survey);
    translation.reset();

    injectDataListTranslationSummaries(
      createCreator(survey, translation) as never,
      new Map([["42", catalog]]),
    );
    bindAddLocalePlaceholderRefresh(translation);

    translation.addLocale("bg");

    const { matrix } = getSummaryMatrix(translation);
    expect(matrix?.columns.map((column) => column.name)).toEqual([
      "default",
      "bg",
    ]);
    expect(
      matrix?.visibleRows[0]?.cells.map((cell) => cell.question.placeholder),
    ).toEqual([DATA_LIST_LOCALE_TRANSLATED, DATA_LIST_LOCALE_TRANSLATED]);
  });
});
