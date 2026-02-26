import { describe, expect, it, vi } from "vitest";
import {
  DynamicPanelItemValueChangedEvent,
  QuestionPanelDynamicModel,
  SurveyModel,
} from "survey-core";
import { registerLoopExitHandlers } from "@/lib/survey-features/question-loops/handle-loop-navigation";
import { DynamicLoopModel } from "../types";

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

  loopPanel.panelCount = 3;
  loopPanel.loopSource = ["item1"];

  return { survey, loopPanel };
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

describe("handleLoopExits - gating (early return)", () => {
  it("returns early when loopSource is missing or empty", () => {
    const { survey, loopPanel } = createLoopingSurvey();
    const dispose = registerLoopExitHandlers(survey);
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
    dispose?.();
  });

  it("returns early when loopSource is set but neither exit condition is set", () => {
    const { survey, loopPanel } = createLoopingSurvey();
    const dispose = registerLoopExitHandlers(survey);
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
    dispose?.();
  });
});

describe("handleLoopExits - exitAllLoopsCondition", () => {
  it("calls runCondition with resolved panel expression and hides subsequent panels when the condition evaluates to true", () => {
    const { survey, loopPanel } = createLoopingSurvey();
    const dispose = registerLoopExitHandlers(survey);
    const navSpy = vi.spyOn(survey, "updateNavigationElements");
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
    const currentPanelQuestions = loopPanel.panels[0].questions;
    expect(currentPanelQuestions.find((q) => q.name === "exitFlag")?.visible).toBe(true);
    expect(currentPanelQuestions.find((q) => q.name === "q1")?.visible).toBe(false);
    expect(currentPanelQuestions.find((q) => q.name === "q2")?.visible).toBe(false);
    expect(navSpy).toHaveBeenCalled();

    runConditionSpy.mockRestore();
    dispose?.();
  });

  it("shows subsequent panels again when the exit-all condition becomes false", () => {
    const { survey, loopPanel } = createLoopingSurvey();
    const dispose = registerLoopExitHandlers(survey);
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
    dispose?.();
  });
});

describe("handleLoopExits - exitLoopCondition", () => {
  it("hides subsequent questions in the current panel when the exit-loop condition evaluates to true", () => {
    const { survey, loopPanel } = createLoopingSurvey();
    const dispose = registerLoopExitHandlers(survey);
    const navSpy = vi.spyOn(survey, "updateNavigationElements");
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
    expect(navSpy).toHaveBeenCalled();

    runConditionSpy.mockRestore();
    dispose?.();
  });

  it("shows subsequent questions again when the exit-loop condition becomes false", () => {
    const { survey, loopPanel } = createLoopingSurvey();
    const dispose = registerLoopExitHandlers(survey);
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
    dispose?.();
  });
});

