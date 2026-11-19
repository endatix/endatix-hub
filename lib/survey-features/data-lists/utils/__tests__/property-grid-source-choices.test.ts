import { describe, expect, it, beforeAll, vi } from "vitest";
import { SurveyModel } from "survey-core";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import { loadMultiSourceChoicesInCreator } from "../../use-cases/load-multi-source-choices-in-creator";
import { searchDataListChoices } from "../../use-cases/search-data-lists/search-data-list-choices";
import { registerDataListGlobals } from "../../infrastructure/registry";
import {
  formatSourceChoiceLabel,
  getDataListSourceRefs,
  getStaticChoicesFromSources,
  hasDataListSource,
} from "../property-grid-source-choices";

vi.mock("../../use-cases/search-data-lists/search-data-list-choices", () => ({
  searchDataListChoices: vi.fn(),
}));

describe("property-grid-source-choices", () => {
  beforeAll(() => {
    registerDataListGlobals();
  });

  it("detects data-list powered sources", () => {
    const survey = new SurveyModel({
      elements: [
        { type: "tagbox", name: "src", edxDataListId: "list-1" },
        { type: "checkbox", name: "static", choices: ["A"] },
      ],
    });

    expect(
      hasDataListSource([
        survey.getQuestionByName("src")!,
        survey.getQuestionByName("static")!,
      ]),
    ).toBe(true);
  });

  it("returns static choices with source labels", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "brands",
          choices: ["A", "B"],
        },
      ],
    });

    const choices = getStaticChoicesFromSources(
      [survey.getQuestionByName("brands")!],
      "",
      formatSourceChoiceLabel,
    );

    expect(choices).toEqual([
      { value: "A", text: "brands: (A)" },
      { value: "B", text: "brands: (B)" },
    ]);
  });

  it("filters static choices by search text", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "brands",
          choices: ["Apple", "Banana"],
        },
      ],
    });

    const choices = getStaticChoicesFromSources(
      [survey.getQuestionByName("brands")!],
      "ban",
      formatSourceChoiceLabel,
    );

    expect(choices).toEqual([{ value: "Banana", text: "brands: (Banana)" }]);
  });
});

describe("getDataListSourceRefs through chained sources", () => {
  beforeAll(() => {
    registerDataListGlobals();
  });

  it("lists a data list reached through several sources once, under the first source", () => {
    const survey = new SurveyModel({
      elements: [
        { type: "tagbox", name: "question1", edxDataListId: "list-1" },
        {
          type: "checkbox",
          name: "question2",
          choicesFromQuestion: "question1",
        },
      ],
    });
    survey.setDesignMode(true);

    const refs = getDataListSourceRefs([
      survey.getQuestionByName("question2")!,
      survey.getQuestionByName("question1")!,
    ]);

    expect(refs).toEqual([{ sourceName: "question2", dataListId: "list-1" }]);
  });

  it("fetches and counts a data list bound to two direct sources once", async () => {
    vi.mocked(searchDataListChoices).mockResolvedValue(
      ApiResult.success({
        items: [
          { value: "a", text: "A" },
          { value: "b", text: "B" },
        ],
        total: 2,
      }),
    );
    const survey = new SurveyModel({
      elements: [
        { type: "tagbox", name: "question1", edxDataListId: "list-1" },
        { type: "tagbox", name: "question2", edxDataListId: "list-1" },
      ],
    });
    survey.setDesignMode(true);

    const result = await loadMultiSourceChoicesInCreator(
      {} as ExtensionRuntimeDeps,
      [
        survey.getQuestionByName("question1")!,
        survey.getQuestionByName("question2")!,
      ],
      { skip: 0, take: 25 },
    );

    expect(searchDataListChoices).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      items: [
        { value: "a", text: "question1: (A)" },
        { value: "b", text: "question1: (B)" },
      ],
      total: 2,
    });
  });
});
