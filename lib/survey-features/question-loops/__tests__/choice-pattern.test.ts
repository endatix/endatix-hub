import { beforeAll, describe, expect, it } from "vitest";
import { SurveyModel } from "survey-core";
import { registerQuestionLoopsGlobals } from "../infrastructure/registry";
import { syncSingleLoopSource } from "../use-cases/sync-loop-source";
import { bindFeatureToSurvey } from "../infrastructure/survey-bindings";
import { DynamicLoopModel, SourceSelectionModes } from "../types";

const LOOP_OVER_VALUES = Object.values(SourceSelectionModes);

function loopSurveyJson(choicePattern?: string) {
  return {
    elements: [
      { type: "checkbox", name: "brands", choices: ["a", "b", "c"] },
      {
        type: "paneldynamic",
        name: "loop",
        loopSource: ["brands"],
        ...(choicePattern !== undefined && { choicePattern }),
        templateElements: [{ type: "text", name: "why" }],
      },
    ],
  };
}

function getLoop(survey: SurveyModel): DynamicLoopModel {
  return survey.getQuestionByName("loop") as unknown as DynamicLoopModel;
}

describe("Loop over (choicePattern)", () => {
  beforeAll(() => {
    registerQuestionLoopsGlobals();
  });

  it("defaults to Selected Only and is not serialized", () => {
    const loop = getLoop(new SurveyModel(loopSurveyJson()));

    expect(loop.choicePattern).toBe(SourceSelectionModes.SelectedOnly);
    expect(loop.toJSON().choicePattern).toBeUndefined();
  });

  it.each(LOOP_OVER_VALUES)("stores %s when set", (value) => {
    const loop = getLoop(new SurveyModel(loopSurveyJson()));

    loop.choicePattern = value;

    expect(loop.choicePattern).toBe(value);
    if (value !== SourceSelectionModes.SelectedOnly) {
      expect(loop.toJSON().choicePattern).toBe(value);
    }
  });

  it.each(LOOP_OVER_VALUES)("loads %s from JSON", (value) => {
    const loop = getLoop(new SurveyModel(loopSurveyJson(value)));

    expect(loop.choicePattern).toBe(value);
  });

  it("falls back to Selected Only when cleared", () => {
    const loop = getLoop(new SurveyModel(loopSurveyJson("All")));

    loop.choicePattern = undefined as never;

    expect(loop.choicePattern).toBe(SourceSelectionModes.SelectedOnly);
  });

  it.each([
    [SourceSelectionModes.SelectedOnly, ["a"]],
    [SourceSelectionModes.UnselectedOnly, ["b", "c"]],
    [SourceSelectionModes.All, ["a", "b", "c"]],
  ])("loops over the %s items", (value, expected) => {
    const survey = new SurveyModel(loopSurveyJson(value));
    survey.setValue("brands", ["a"]);

    syncSingleLoopSource(survey, getLoop(survey));

    const panels = getLoop(survey).value as Array<{ itemValue: string }>;
    expect(panels.map((p) => p.itemValue)).toEqual(expected);
  });

  it.each([
    [SourceSelectionModes.SelectedOnly, []],
    [SourceSelectionModes.UnselectedOnly, ["a", "b", "c"]],
    [SourceSelectionModes.All, ["a", "b", "c"]],
  ])("fills a bound %s loop before any answer", (value, expected) => {
    const survey = new SurveyModel(loopSurveyJson(value));

    const dispose = bindFeatureToSurvey(survey);

    const panels = (getLoop(survey).value ?? []) as Array<{
      itemValue: string;
    }>;
    expect(panels.map((p) => p.itemValue)).toEqual(expected);
    dispose();
  });

  it("drops a panel when its item gets selected in a bound Unselected Only loop", () => {
    const survey = new SurveyModel(
      loopSurveyJson(SourceSelectionModes.UnselectedOnly),
    );
    const dispose = bindFeatureToSurvey(survey);
    const itemValues = () =>
      ((getLoop(survey).value ?? []) as Array<{ itemValue: string }>).map(
        (p) => p.itemValue,
      );

    survey.setValue("brands", ["b"]);
    expect(itemValues()).toEqual(["a", "c"]);

    dispose();
  });
});
