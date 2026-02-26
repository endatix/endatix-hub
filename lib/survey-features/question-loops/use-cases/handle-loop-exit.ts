import { DynamicPanelItemValueChangedEvent, SurveyModel } from "survey-core";
import { DynamicLoopModel, LoopExitState } from "../types";
import { isLoopQuestion, resolveDynamicLoopCondition } from "../loop-utils";

/**
 * Handles the loop exit for a dynamic loop question
 * This is implementation of onDynamicPanelValueChanged event handler https://surveyjs.io/form-library/documentation/api-reference/survey-data-model#onDynamicPanelValueChanged
 * @param sender - The survey model
 * @param options - The options for the dynamic panel item value changed event
 */
export function handleLoopExit(
  sender: SurveyModel,
  options: DynamicPanelItemValueChangedEvent,
) {
  const loopPanel = options.question as DynamicLoopModel;

  if (!isLoopQuestion(loopPanel)) return;

  const { exitLoopCondition, exitAllLoopsCondition } = loopPanel;
  if (!exitAllLoopsCondition && !exitLoopCondition) return;

  const meta: LoopExitState = loopPanel.exitMeta ?? {
    exitCurrentTriggeredIndexMap: {},
  };
  let stateChanged = false;

  if (
    typeof exitAllLoopsCondition === "string" &&
    exitAllLoopsCondition.trim() !== ""
  ) {
    const expr = resolveDynamicLoopCondition(
      exitAllLoopsCondition,
      loopPanel.name,
      options.panelIndex,
    );
    const shouldExitAll = !!sender.runCondition(expr);

    if (shouldExitAll) {
      if (
        meta.exitAllTriggeredPanelIndex === undefined ||
        meta.exitAllTriggeredPanelIndex > options.panelIndex
      ) {
        meta.exitAllTriggeredPanelIndex = options.panelIndex;
        stateChanged = true;
      }
    } else if (meta.exitAllTriggeredPanelIndex === options.panelIndex) {
      meta.exitAllTriggeredPanelIndex = undefined;
      stateChanged = true;
    }
  }

  if (
    typeof exitLoopCondition === "string" &&
    exitLoopCondition.trim() !== ""
  ) {
    const expr = resolveDynamicLoopCondition(
      exitLoopCondition,
      loopPanel.name,
      options.panelIndex,
    );
    const shouldExitCurrent = !!sender.runCondition(expr);

    if (!meta.exitCurrentTriggeredIndexMap)
      meta.exitCurrentTriggeredIndexMap = {};

    if (shouldExitCurrent) {
      const triggerIndex = options.panel.questions.findIndex(
        (q) => q.name === options.name,
      );
      if (
        triggerIndex !== -1 &&
        meta.exitCurrentTriggeredIndexMap[options.panelIndex] !== triggerIndex
      ) {
        meta.exitCurrentTriggeredIndexMap[options.panelIndex] = triggerIndex;
        stateChanged = true;
      }
    } else if (
      meta.exitCurrentTriggeredIndexMap[options.panelIndex] !== undefined
    ) {
      delete meta.exitCurrentTriggeredIndexMap[options.panelIndex];
      stateChanged = true;
    }
  }

  if (stateChanged) {
    loopPanel.exitMeta = {
      exitAllTriggeredPanelIndex: meta.exitAllTriggeredPanelIndex,
      exitCurrentTriggeredIndexMap: { ...meta.exitCurrentTriggeredIndexMap },
    };
    sender.runExpressions();
  }
}
