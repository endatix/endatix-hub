import { beforeAll, describe, expect, it } from "vitest";
import { SurveyModel } from "survey-core";
import { loadLoopSources } from "../use-cases/load-loop-sources";
import { registerQuestionLoopsGlobals } from "../infrastructure/registry";
import {
  sampleLoopSurveySchema,
  SAMPLE_LOOP_PANEL_NAME,
  SAMPLE_LOOP_SOURCE_NAME,
} from "./fixtures/sample-loop-survey";

beforeAll(() => {
  registerQuestionLoopsGlobals();
});

describe("loadLoopSources", () => {
  it("syncs panel when value changes on a question in panel loopSource (integration)", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const panel = survey.getQuestionByName(SAMPLE_LOOP_PANEL_NAME);
    const source = survey.getQuestionByName(SAMPLE_LOOP_SOURCE_NAME);
    expect(panel).toBeDefined();
    expect(source).toBeDefined();
    source!.value = ["kia", "toyota"];

    // act
    loadLoopSources(survey, {
      name: SAMPLE_LOOP_SOURCE_NAME,
      value: ["kia", "toyota"],
    } as any);

    // assert
    const value = (panel as any).value as Array<{ itemValue: string }>;
    expect(Array.isArray(value)).toBe(true);
    expect(value.length).toBe(2);
    expect(value.map((p) => p.itemValue).sort()).toEqual(["kia", "toyota"]);
  });

  it("does not update panel when changed question is not in any loopSource", () => {
    // arrange
    const survey = new SurveyModel({
      elements: [
        { type: "text", name: "otherQ" },
        {
          type: "paneldynamic",
          name: "loopPanel",
          templateElements: [{ type: "text", name: "t1" }],
          loopSource: ["sourceQ"],
        },
        { type: "tagbox", name: "sourceQ", choices: ["a", "b"] },
      ],
    });
    const panel = survey.getQuestionByName("loopPanel") as any;
    panel.loopSource = ["sourceQ"];
    panel.priorityItems = [];
    panel.maxLoopCount = "5";
    const source = survey.getQuestionByName("sourceQ");
    source!.value = ["a"];
    loadLoopSources(survey, { name: "sourceQ", value: ["a"] } as any);
    const valueAfterSource = (panel.value as any[])?.length ?? 0;

    // act
    survey.setValue("otherQ", "x");
    loadLoopSources(survey, { name: "otherQ", value: "x" } as any);

    // assert
    expect((panel.value as any[])?.length).toBe(valueAfterSource);
  });

  it("syncs panels when a loop control property name changes", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const panel = survey.getQuestionByName(SAMPLE_LOOP_PANEL_NAME) as any;
    const source = survey.getQuestionByName(SAMPLE_LOOP_SOURCE_NAME);
    source!.value = ["kia"];
    loadLoopSources(survey, {
      name: SAMPLE_LOOP_SOURCE_NAME,
      value: ["kia"],
    } as any);
    expect((panel.value as any[])?.length).toBe(1);
    panel.maxLoopCount = "5";

    // act
    loadLoopSources(survey, { name: "maxLoopCount", value: 5 } as any);

    // assert
    expect((panel.value as any[])?.length).toBe(1);
    expect((panel.value as any[])[0].itemValue).toBe("kia");
  });

  it("updates panel value from fixture when source has selected values (full user path)", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    survey.setValue(SAMPLE_LOOP_SOURCE_NAME, ["kia", "huyndai", "honda"]);

    // act
    loadLoopSources(survey, {
      name: SAMPLE_LOOP_SOURCE_NAME,
      value: ["kia", "huyndai", "honda"],
    } as any);

    // assert
    const panel = survey.getQuestionByName(SAMPLE_LOOP_PANEL_NAME) as any;
    const value = panel.value as Array<{ itemValue: string }>;
    expect(value).toHaveLength(3);
    expect(new Set(value.map((p) => p.itemValue))).toEqual(
      new Set(["kia", "huyndai", "honda"]),
    );
  });

  it("creates panels when source has defaultValue and loadLoopSources is triggered (e.g. on survey load)", () => {
    // arrange
    const schemaWithDefault = {
      elements: [
        {
          type: "tagbox",
          name: "brands",
          title: "Brands",
          choices: [
            { value: "kia", text: "Kia" },
            { value: "honda", text: "Honda" },
            { value: "toyota", text: "Toyota" },
          ],
          defaultValue: ["kia", "toyota"],
        },
        {
          type: "paneldynamic",
          name: "favouriteCars",
          templateElements: [{ type: "text", name: "q1" }],
          loopSource: ["brands"],
          maxLoopCount: "10",
          randomizeLoop: false,
        },
      ],
    };
    const survey = new SurveyModel(schemaWithDefault as any);
    const source = survey.getQuestionByName("brands");
    const panel = survey.getQuestionByName("favouriteCars");
    source!.value = ["kia", "toyota"];

    // act
    loadLoopSources(survey, {
      name: "brands",
      value: ["kia", "toyota"],
    } as any);

    // assert
    const value = (panel as any).value as Array<{ itemValue: string }>;
    expect(value).toHaveLength(2);
    expect(new Set(value.map((p) => p.itemValue))).toEqual(
      new Set(["kia", "toyota"]),
    );
  });

  it("creates panels when source has value on load (saved/loaded data) and loadLoopSources is called", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const loadedValue = ["nissan", "honda"];
    survey.setValue(SAMPLE_LOOP_SOURCE_NAME, loadedValue);

    // act
    loadLoopSources(survey, {
      name: SAMPLE_LOOP_SOURCE_NAME,
      value: loadedValue,
    } as any);

    // assert
    const panel = survey.getQuestionByName(SAMPLE_LOOP_PANEL_NAME) as any;
    const value = panel.value as Array<{ itemValue: string }>;
    expect(value).toHaveLength(2);
    expect(new Set(value.map((p) => p.itemValue))).toEqual(
      new Set(["nissan", "honda"]),
    );
  });
});
