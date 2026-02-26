import { SurveyModel } from "survey-core";
import { handleLoopExit } from "../use-cases/handle-loop-exit";
import {
  injectVisibilityConditions,
  removeLoopExitWrappers,
} from "../use-cases/inject-visibility-conditions";
import { loadLoopSources } from "../use-cases/load-loop-sources";

/**
 * Binds the feature to the survey
 * @param survey - The survey to bind the feature to
 * @returns A function to unbind the feature from the survey
 */
export function bindFeatureToSurvey(survey: SurveyModel): () => void {
  survey.onValueChanged.add(loadLoopSources);
  survey.onDynamicPanelValueChanged.add(handleLoopExit);
  injectVisibilityConditions(survey);

  return () => {
    survey.onValueChanged.remove(loadLoopSources);
    survey.onDynamicPanelValueChanged.remove(handleLoopExit);
  };
}
