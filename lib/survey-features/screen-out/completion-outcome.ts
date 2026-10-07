import { isScreenOutTrigger } from "./constants";

interface CompletingTrigger {
  getType?: () => string;
  expression?: string;
}

/** The parts of `SurveyModel` the decision reads. Keeps survey-core out of this file. */
export interface CompletingSurvey {
  triggers: CompletingTrigger[];
  runCondition(expression: string): boolean;
}

/**
 * Whether a finished survey ends as a screen-out. A screen-out wins over a
 * Complete trigger that also holds.
 *
 * `completeTrigger` alone is not enough: survey-core's "Try again" calls
 * `saveDataOnComplete()` without it, and `completedTrigger` returns whichever
 * trigger was recorded first. So a screen-out trigger whose expression still
 * holds on the final data also counts.
 */
export function isScreenedOutOnComplete(
  survey: CompletingSurvey,
  completeTrigger?: CompletingTrigger,
): boolean {
  if (isScreenOutTrigger(completeTrigger)) {
    return true;
  }

  return survey.triggers.some(
    (trigger) =>
      isScreenOutTrigger(trigger) &&
      Boolean(trigger.expression) &&
      survey.runCondition(trigger.expression as string),
  );
}
