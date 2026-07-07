import { describe, expect, it, beforeAll } from "vitest";
import { SurveyModel } from "survey-core";
import { registerDataListGlobals } from "../../infrastructure/registry";
import {
  formatSourceChoiceLabel,
  getStaticChoicesFromSources,
  hasDataListSource,
} from "../property-grid-source-choices";

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
