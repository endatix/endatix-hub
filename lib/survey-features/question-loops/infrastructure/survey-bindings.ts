import { SurveyModel } from "survey-core";
import { handleLoopExit } from "../use-cases/handle-loop-exit";
import { injectVisibilityConditions } from "../use-cases/inject-visibility-conditions";
import {
  loadLoopSources,
  loadNestedLoopSources,
} from "../use-cases/load-loop-sources";
import { syncLoopExitState } from "../use-cases/sync-loop-exit-state";
import { syncLoopTrees } from "../use-cases/sync-loop-tree";
import {
  collectLoopInstances,
  collectRootLoopInstances,
} from "../utils/collect-loop-questions";
import { runLoopSyncExclusively } from "./loop-sync-state";

/**
 * Rebuilds loop panels from data already on the model — prefilled defaults or a
 * resumed submission. Nested loops are reached by cascading from the root loops
 * rather than by enumerating them up front, because a nested loop has no
 * instance until its container has panels.
 */
function hydrateLoopsFromData(survey: SurveyModel): void {
  runLoopSyncExclusively(survey, () => {
    syncLoopTrees(survey, collectRootLoopInstances(survey));
  });

  // Panels created by the cascade were not around for the first injection pass,
  // and exit state is evaluated against the conditions, so re-injecting has to
  // happen between the two.
  injectVisibilityConditions(survey);

  // Exit state runs last, over every depth: the panels it inspects only exist
  // once the cascade above has committed.
  for (const loopPanel of collectLoopInstances(survey)) {
    syncLoopExitState(survey, loopPanel);
  }
}

/**
 * Binds the feature to the survey.
 *
 * **Bind after assigning `survey.data`.** A bulk assignment fires no events —
 * `setDataCore` writes the values hash and notifies questions directly — so a
 * binding made beforehand has nothing to react to, and loops whose panels are
 * not already stored in that data stay empty. Binding afterwards lets
 * {@link hydrateLoopsFromData} rebuild them (h938).
 *
 * @param survey - The survey to bind the feature to
 * @returns A function to unbind the feature from the survey
 */
export function bindFeatureToSurvey(survey: SurveyModel): () => void {
  injectVisibilityConditions(survey);

  if (survey.data && Object.keys(survey.data).length > 0) {
    hydrateLoopsFromData(survey);
  }

  survey.onValueChanged.add(loadLoopSources);
  survey.onDynamicPanelValueChanged.add(loadNestedLoopSources);
  survey.onDynamicPanelValueChanged.add(handleLoopExit);

  return () => {
    survey.onValueChanged.remove(loadLoopSources);
    survey.onDynamicPanelValueChanged.remove(loadNestedLoopSources);
    survey.onDynamicPanelValueChanged.remove(handleLoopExit);
  };
}
