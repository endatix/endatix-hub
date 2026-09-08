import {
  DynamicPanelItemValueChangedEvent,
  Question,
  SurveyModel,
  ValueChangedEvent,
} from "survey-core";
import { DynamicLoopModel } from "../types";
import { runLoopSyncExclusively } from "../infrastructure/loop-sync-state";
import {
  collectLoopInstances,
  collectLoopsInPanel,
} from "../utils/collect-loop-questions";
import { matchesLoopSource } from "../utils/loop-source-name";
import { resolveLoopSource } from "../utils/resolve-loop-source";
import { syncLoopTree } from "./sync-loop-tree";

/**
 * Properties that change how a loop expands rather than what it expands over.
 * A change to any of them re-syncs every loop.
 */
const LOOP_CONTROL_PROPERTIES = new Set([
  "randomizeLoop",
  "choicePattern",
  "maxLoopCount",
  "priorityItems",
]);

/**
 * Whether a change to `changedName` should re-sync this loop.
 *
 * Name matching alone is deliberately loose — a nested loop sourcing
 * `panel.brands` matches a change to a page-level `brands` too. When the
 * changed question object is available, resolution decides instead: the loop is
 * only synced if one of its sources actually resolves to that question. Events
 * without a question (the synthetic ones used in tests) fall back to the name.
 */
function isAffectedLoop(
  loop: DynamicLoopModel,
  changedName: string,
  changedQuestion?: Question,
): boolean {
  if (!matchesLoopSource(loop.loopSource, changedName)) {
    return false;
  }

  if (!changedQuestion) {
    return true;
  }

  return loop.loopSource.some(
    (sourceName) => resolveLoopSource(loop, sourceName) === changedQuestion,
  );
}

/**
 * Re-syncs loops after a top-level value change.
 *
 * Handler for `onValueChanged`
 * https://surveyjs.io/form-library/documentation/api-reference/survey-data-model#onValueChanged
 *
 * This event never fires for a question inside a dynamic panel — SurveyJS
 * raises it for the container instead — so nested sources arrive through
 * {@link loadNestedLoopSources}.
 */
export function loadLoopSources(
  sender: SurveyModel,
  options: ValueChangedEvent,
) {
  const isControlChange = LOOP_CONTROL_PROPERTIES.has(options.name);
  const changedQuestion = isControlChange
    ? undefined
    : ((options as { question?: Question }).question ??
      sender.getQuestionByName(options.name) ??
      undefined);

  runLoopSyncExclusively(sender, () => {
    const affected = collectLoopInstances(sender).filter(
      (loop) =>
        isControlChange || isAffectedLoop(loop, options.name, changedQuestion),
    );

    for (const loop of affected) {
      syncLoopTree(sender, loop);
    }
  });
}

/**
 * Re-syncs loops after a value change inside a dynamic panel.
 *
 * Handler for `onDynamicPanelValueChanged`
 * https://surveyjs.io/form-library/documentation/api-reference/survey-data-model#onDynamicPanelValueChanged
 *
 * Only loops living in the panel the change came from are considered, which is
 * what keeps sibling panels independent: each holds its own copy of the source
 * question and its own loop instance.
 */
export function loadNestedLoopSources(
  sender: SurveyModel,
  options: DynamicPanelItemValueChangedEvent,
) {
  const panel = options?.panel;
  if (!panel) {
    return;
  }

  runLoopSyncExclusively(sender, () => {
    for (const loop of collectLoopsInPanel(panel)) {
      if (matchesLoopSource(loop.loopSource, options.name)) {
        syncLoopTree(sender, loop);
      }
    }
  });
}
