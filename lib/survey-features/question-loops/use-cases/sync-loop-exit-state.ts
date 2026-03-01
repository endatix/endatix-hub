import { SurveyModel, PanelModel } from "survey-core";
import { DynamicLoopModel } from "../types";
import {
  isNonEmptyCondition,
  resolveDynamicLoopCondition,
} from "../loop-utils";
import { createLoopExitCommand } from "./handle-loop-exit";

const FIRST_QUESTION_INDEX = 0;

/**
 * Finds the index of the last question in a panel that has a value.
 * Used during initial load when we don't have a specific event trigger.
 */
function findLastAnsweredQuestionIndex(panel: PanelModel): number {
  for (let i = panel.questions.length - 1; i >= 0; i--) {
    if (!panel.questions[i].isEmpty()) return i;
  }

  return FIRST_QUESTION_INDEX;
}

/**
 * Full state evaluation pass. Used on initial model load to process default values and pre-filled data.
 */
export function syncLoopExitState(
  survey: SurveyModel,
  loopPanel: DynamicLoopModel,
) {
  const { exitLoopCondition, exitAllLoopsCondition } = loopPanel;

  if (!exitAllLoopsCondition && !exitLoopCondition) return;

  const command = createLoopExitCommand(loopPanel);

  loopPanel.panels.forEach((panel, panelIndex) => {
    if (isNonEmptyCondition(exitAllLoopsCondition)) {
      const exitAllExpression = resolveDynamicLoopCondition(
        exitAllLoopsCondition,
        loopPanel.name,
        panelIndex,
      );

      const isExitAllConditionMet = survey.runCondition(exitAllExpression);

      command.processExitAll(isExitAllConditionMet, panelIndex);
    }

    // 2. Process "Exit Current" Logic
    if (isNonEmptyCondition(exitLoopCondition)) {
      const exitCurrentExpression = resolveDynamicLoopCondition(
        exitLoopCondition,
        loopPanel.name,
        panelIndex,
      );

      const isExitCurrentConditionMet = survey.runCondition(exitCurrentExpression);

      const triggerIndex = isExitCurrentConditionMet
        ? findLastAnsweredQuestionIndex(panel)
        : -1;

      command.processExitCurrent(
        isExitCurrentConditionMet,
        panelIndex,
        triggerIndex,
      );
    }
  });

  if (command.apply()) {
    survey.runExpressions();
  }
}
