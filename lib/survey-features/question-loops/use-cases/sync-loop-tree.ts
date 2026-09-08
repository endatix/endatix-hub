import { SurveyModel } from "survey-core";
import { DynamicLoopModel } from "../types";
import {
  collectLoopsInPanel,
  isLoopQuestion,
  isWithinDepthLimit,
} from "../utils/collect-loop-questions";
import { syncSingleLoopSource } from "./sync-loop-source";

/**
 * Syncs a loop and every loop nested inside the panels it produces.
 *
 * The cascade is explicit rather than event-driven because neither event that
 * could carry it fires: `onValueChanged` reports the container, not the nested
 * question, and `onDynamicPanelAdded` stays silent when panels are created by
 * assigning `value` — which is exactly how panels are created here. Both are
 * pinned by the shape guards in `__tests__/surveyjs-shape-guards.test.ts`.
 *
 * Note the deliberate order: `value` is assigned first and the resulting
 * `panels` are read afterwards. That breaks the usual build-in-memory-then-
 * mutate-once shape on purpose — nested loop instances do not exist until the
 * containing assignment has committed, so there is nothing to descend into
 * before it.
 *
 * Callers are responsible for holding the survey's sync guard
 * (`runLoopSyncExclusively`); this function does not take it, so that one
 * cascade is a single guarded region.
 */
export function syncLoopTree(
  survey: SurveyModel,
  loopQuestion: DynamicLoopModel,
): void {
  if (!isLoopQuestion(loopQuestion) || !isWithinDepthLimit(loopQuestion)) {
    return;
  }

  syncSingleLoopSource(survey, loopQuestion);

  for (const panel of loopQuestion.panels ?? []) {
    for (const nestedLoop of collectLoopsInPanel(panel)) {
      syncLoopTree(survey, nestedLoop);
    }
  }
}

/** Syncs several loop trees in order. */
export function syncLoopTrees(
  survey: SurveyModel,
  loopQuestions: DynamicLoopModel[],
): void {
  for (const loopQuestion of loopQuestions) {
    syncLoopTree(survey, loopQuestion);
  }
}
