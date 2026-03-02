import { SurveyModel } from "survey-core";
import { handleLoopExit } from "../use-cases/handle-loop-exit";
import { injectVisibilityConditions } from "../use-cases/inject-visibility-conditions";
import { loadLoopSources } from "../use-cases/load-loop-sources";
import { getAllLoopQuestions } from "../loop-utils";
import { syncLoopExitState } from "../use-cases/sync-loop-exit-state";
import { syncSingleLoopSource } from "../use-cases/sync-loop-source";

/**
 * Binds the feature to the survey
 * @param survey - The survey to bind the feature to
 * @returns A function to unbind the feature from the survey
 */
export function bindFeatureToSurvey(survey: SurveyModel): () => void {
  injectVisibilityConditions(survey);
  if (survey.data && Object.keys(survey.data).length > 0) {
    const loopPanels = getAllLoopQuestions(survey);
    loopPanels.forEach((loopPanel) => {
      syncSingleLoopSource(survey, loopPanel);
      syncLoopExitState(survey, loopPanel);
    });
  }

  survey.onValueChanged.add(loadLoopSources);
  survey.onDynamicPanelValueChanged.add(handleLoopExit);

  return () => {
    survey.onValueChanged.remove(loadLoopSources);
    survey.onDynamicPanelValueChanged.remove(handleLoopExit);
  };
}
