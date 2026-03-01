import { DynamicPanelItemValueChangedEvent, SurveyModel } from "survey-core";
import { DynamicLoopModel, LoopExitMeta } from "../types";
import {
  isLoopQuestion,
  isNonEmptyCondition,
  resolveDynamicLoopCondition,
} from "../loop-utils";
import {
  INITIAL_EXIT_STATE,
  PANEL_VISIBILITY_SENTINEL,
} from "../dynamic-loop-question";

export function createLoopExitCommand(panel: DynamicLoopModel) {
  const state: LoopExitMeta = panel.exitMeta ?? { ...INITIAL_EXIT_STATE };

  let stateChanged = false;

  /**
   * Processes the exit all condition and updates internal state if changes are detected
   * @param shouldExitAll - true if the exit all condition is met
   * @param panelIndex - the index of the panel
   */
  const processExitAll = (shouldExitAll: boolean, panelIndex: number) => {
    if (shouldExitAll) {
      if (!state?.exitAll || state.exitAll?.triggeredPanelIndex > panelIndex) {
        state.exitAll = { triggeredPanelIndex: panelIndex };
        stateChanged = true;
      }
    } else if (state?.exitAll?.triggeredPanelIndex === panelIndex) {
      delete state.exitAll;
      stateChanged = true;
    }
  };

  /**
   * Processes the exit current condition and updates internal state if changes are detected
   * @param shouldExitCurrent - true if the exit current condition is met
   * @param panelIndex - the index of the panel
   * @param triggerIndex - the index of the trigger
   */
  const processExitCurrent = (
    shouldExitCurrent: boolean,
    panelIndex: number,
    triggerIndex: number,
  ) => {
    if (shouldExitCurrent && triggerIndex !== -1) {
      if (!state.exitCurrent) {
        state.exitCurrent = { triggeredIndexMap: {} };
      }

      if (state.exitCurrent.triggeredIndexMap[panelIndex] !== triggerIndex) {
        state.exitCurrent.triggeredIndexMap[panelIndex] = triggerIndex;
        stateChanged = true;
      }
    } else if (state.exitCurrent?.triggeredIndexMap[panelIndex] !== undefined) {
      delete state.exitCurrent.triggeredIndexMap[panelIndex];
      // Cleanup empty object
      if (Object.keys(state.exitCurrent.triggeredIndexMap).length === 0) {
        delete state.exitCurrent;
      }
      stateChanged = true;
    }
  };

  /**
   * Applies the state to the panel
   * @returns true if the state was changed
   */
  const apply = () => {
    if (stateChanged) {
      panel.exitMeta = state;
    }

    return stateChanged;
  };

  return {
    processExitAll,
    processExitCurrent,
    apply,
  };
}

export function createLoopExitQuery(state: Readonly<LoopExitMeta> | undefined) {
  return Object.freeze({
    isExited(panelIndex: number, questionIndex: number): boolean {
      if (!state) return false;

      // hide the entire panel if the exit all condition has been triggered prior to the current panel
      if (state.exitAll && panelIndex > state.exitAll.triggeredPanelIndex) {
        return true;
      }

      if (!state.exitCurrent) {
        return false;
      }

      // hide the question if the exit current condition has been triggered prior to the current question
      const triggeredIndex = state.exitCurrent.triggeredIndexMap[panelIndex];
      const shouldSkipQuestion =
        questionIndex !== PANEL_VISIBILITY_SENTINEL &&
        triggeredIndex !== undefined &&
        questionIndex > triggeredIndex;

      return shouldSkipQuestion;
    },
  });
}

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

  const command = createLoopExitCommand(loopPanel);
  if (isNonEmptyCondition(exitAllLoopsCondition)) {
    const exitAllExpression = resolveDynamicLoopCondition(
      exitAllLoopsCondition,
      loopPanel.name,
      options.panelIndex,
    );
    command.processExitAll(
      !sender.runCondition(exitAllExpression),
      options.panelIndex,
    );
  }

  if (isNonEmptyCondition(exitLoopCondition)) {
    const exitCurrentExpression = resolveDynamicLoopCondition(
      exitLoopCondition,
      loopPanel.name,
      options.panelIndex,
    );
    const triggerIndex = options.panel.questions.findIndex(
      (question) => question.name === options.name,
    );
    command.processExitCurrent(
      !sender.runCondition(exitCurrentExpression),
      options.panelIndex,
      triggerIndex,
    );
  }

  if (command.apply()) {
    sender.runExpressions();
  }
}
