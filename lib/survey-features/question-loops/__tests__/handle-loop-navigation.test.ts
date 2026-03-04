import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  DynamicPanelItemValueChangedEvent,
  SurveyModel,
} from "survey-core";
import { DynamicLoopModel } from "../types";
import { registerQuestionLoopsGlobals } from "../infrastructure/registry";
import { bindFeatureToSurvey } from "../infrastructure/survey-bindings";
import { sampleLoopSurveySchema } from "./fixtures/sample-loop-survey";

function createLoopingSurvey(): { survey: SurveyModel; loopPanel: DynamicLoopModel } {
  const surveyJson = {
    elements: [
      {
        type: "paneldynamic",
        name: "loopPanel",
        templateElements: [
          { type: "text", name: "exitFlag" },
          { type: "text", name: "q1" },
          { type: "text", name: "q2" },
        ],
      },
    ],
  };

  const survey = new SurveyModel(surveyJson);
  const loopPanel = survey.getQuestionByName("loopPanel") as DynamicLoopModel;

  loopPanel.loopSource = ["item1"];

  return { survey, loopPanel };
}

/** Ensures 3 panels exist; call after bind so initial sync does not clear panels. */
function ensureThreePanels(survey: SurveyModel, loopPanel: DynamicLoopModel): void {
  survey.setValue("loopPanel", [{}, {}, {}]);
}

function fireDynamicPanelValueChanged(
  survey: SurveyModel,
  loopPanel: DynamicLoopModel,
  panelIndex: number,
  questionName: string,
): void {
  const panel = loopPanel.panels[panelIndex];

  const options = {
    question: loopPanel,
    panel,
    panelIndex,
    name: questionName,
    value: survey.getValue(`${loopPanel.name}[${panelIndex}].${questionName}`),
  } as unknown as DynamicPanelItemValueChangedEvent;

  survey.onDynamicPanelValueChanged.fire(survey, options);
}

let dispose: (() => void) | undefined;

beforeAll(() => {
  registerQuestionLoopsGlobals();
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
});

describe("handleLoopExits - gating (early return)", () => {
  it("returns early when loopSource is missing or empty", () => {
    const { survey, loopPanel } = createLoopingSurvey();
    dispose = bindFeatureToSurvey(survey);
    ensureThreePanels(survey, loopPanel);
    const runConditionSpy = vi.spyOn(survey, "runCondition");
    const navSpy = vi.spyOn(survey, "updateNavigationElements");

    loopPanel.loopSource = [];
    loopPanel.exitAllLoopsCondition = "{panel.exitFlag} = true";
    survey.setValue("loopPanel[0].exitFlag", true);
    fireDynamicPanelValueChanged(survey, loopPanel, 0, "exitFlag");

    expect(runConditionSpy).not.toHaveBeenCalled();
    expect(navSpy).not.toHaveBeenCalled();
    expect(loopPanel.panels[1].visible).toBe(true);
    expect(loopPanel.panels[2].visible).toBe(true);

    runConditionSpy.mockRestore();
    navSpy.mockRestore();
  });

  it("returns early when loopSource is set but neither exit condition is set", () => {
    const { survey, loopPanel } = createLoopingSurvey();
    dispose = bindFeatureToSurvey(survey);
    ensureThreePanels(survey, loopPanel);
    const runConditionSpy = vi.spyOn(survey, "runCondition");
    const navSpy = vi.spyOn(survey, "updateNavigationElements");

    loopPanel.exitAllLoopsCondition = undefined;
    loopPanel.exitLoopCondition = undefined;
    survey.setValue("loopPanel[0].exitFlag", true);
    fireDynamicPanelValueChanged(survey, loopPanel, 0, "exitFlag");

    expect(runConditionSpy).not.toHaveBeenCalled();
    expect(navSpy).not.toHaveBeenCalled();
    expect(loopPanel.panels[1].visible).toBe(true);
    expect(loopPanel.panels[2].visible).toBe(true);

    runConditionSpy.mockRestore();
    navSpy.mockRestore();
  });
});

describe("handleLoopExits - exitAllLoopsCondition", () => {
  it("calls runCondition with resolved panel expression and hides subsequent panels when the condition evaluates to true", () => {
    const { survey, loopPanel } = createLoopingSurvey();
    dispose = bindFeatureToSurvey(survey);
    ensureThreePanels(survey, loopPanel);
    const runConditionSpy = vi
      .spyOn(survey, "runCondition")
      .mockReturnValue(true);

    loopPanel.exitAllLoopsCondition = "{panel.exitFlag} = true";

    survey.setValue("loopPanel[0].exitFlag", true);
    fireDynamicPanelValueChanged(survey, loopPanel, 0, "exitFlag");

    expect(runConditionSpy).toHaveBeenCalledTimes(1);
    expect(runConditionSpy).toHaveBeenCalledWith(
      "{loopPanel[0].exitFlag} = true",
    );
    expect(loopPanel.panels[0].visible).toBe(true);
    expect(loopPanel.panels[1].visible).toBe(false);
    expect(loopPanel.panels[2].visible).toBe(false);

    runConditionSpy.mockRestore();
  });

  it("shows subsequent panels again when the exit-all condition becomes false", () => {
    const { survey, loopPanel } = createLoopingSurvey();
    dispose = bindFeatureToSurvey(survey);
    ensureThreePanels(survey, loopPanel);
    const runConditionSpy = vi
      .spyOn(survey, "runCondition")
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    loopPanel.exitAllLoopsCondition = "{panel.exitFlag} = true";

    survey.setValue("loopPanel[0].exitFlag", true);
    fireDynamicPanelValueChanged(survey, loopPanel, 0, "exitFlag");

    expect(loopPanel.panels[1].visible).toBe(false);
    expect(loopPanel.panels[2].visible).toBe(false);

    survey.setValue("loopPanel[0].exitFlag", false);
    fireDynamicPanelValueChanged(survey, loopPanel, 0, "exitFlag");

    expect(loopPanel.panels[1].visible).toBe(true);
    expect(loopPanel.panels[2].visible).toBe(true);
    const currentPanelQuestions = loopPanel.panels[0].questions;
    expect(currentPanelQuestions.find((q) => q.name === "q1")?.visible).toBe(true);
    expect(currentPanelQuestions.find((q) => q.name === "q2")?.visible).toBe(true);

    expect(runConditionSpy).toHaveBeenCalledTimes(2);
    runConditionSpy.mockRestore();
  });
});

describe("handleLoopExits - exitLoopCondition", () => {
  it("hides subsequent questions in the current panel when the exit-loop condition evaluates to true", () => {
    const { survey, loopPanel } = createLoopingSurvey();
    dispose = bindFeatureToSurvey(survey);
    ensureThreePanels(survey, loopPanel);
    const runConditionSpy = vi
      .spyOn(survey, "runCondition")
      .mockReturnValue(true);

    loopPanel.exitLoopCondition = '{panel.q1} = "stop"';

    survey.setValue("loopPanel[0].q1", "stop");
    fireDynamicPanelValueChanged(survey, loopPanel, 0, "q1");

    const questions = loopPanel.panels[0].questions;

    expect(questions.find((q) => q.name === "q1")?.visible).toBe(true);
    expect(questions.find((q) => q.name === "q2")?.visible).toBe(false);
    expect(runConditionSpy).toHaveBeenCalledTimes(1);

    runConditionSpy.mockRestore();
  });

  it("shows subsequent questions again when the exit-loop condition becomes false", () => {
    const { survey, loopPanel } = createLoopingSurvey();
    dispose = bindFeatureToSurvey(survey);
    ensureThreePanels(survey, loopPanel);
    const runConditionSpy = vi
      .spyOn(survey, "runCondition")
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    loopPanel.exitLoopCondition = '{panel.q1} = "stop"';

    survey.setValue("loopPanel[0].q1", "stop");
    fireDynamicPanelValueChanged(survey, loopPanel, 0, "q1");

    let questions = loopPanel.panels[0].questions;
    expect(questions.find((q) => q.name === "q2")?.visible).toBe(false);

    survey.setValue("loopPanel[0].q1", "continue");
    fireDynamicPanelValueChanged(survey, loopPanel, 0, "q1");

    questions = loopPanel.panels[0].questions;
    expect(questions.find((q) => q.name === "q2")?.visible).toBe(true);

    expect(runConditionSpy).toHaveBeenCalledTimes(2);
    runConditionSpy.mockRestore();
  });
});

describe("integration with sample-loop-survey", () => {
  it("binds feature and creates loop panels when source value is set", () => {
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    dispose = bindFeatureToSurvey(survey);

    const loopPanel = survey.getQuestionByName("favouriteCars");
    expect(loopPanel).toBeDefined();

    survey.setValue("brands", ["kia", "toyota"]);

    const panelValue = loopPanel?.value as unknown[] | undefined;
    expect(panelValue).toBeDefined();
    expect(Array.isArray(panelValue)).toBe(true);
    expect(panelValue?.length).toBe(2);
  });
});
