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

/** The parts of survey-core's `CompleteEvent` the decision reads. */
export interface CompletingEvent {
  completeTrigger?: CompletingTrigger;
  isCompleteOnTrigger?: boolean;
}

/** Decides whether an `onComplete` ends the survey as a screen-out. */
export type ScreenOutDecision = (
  survey: CompletingSurvey,
  event: CompletingEvent,
) => boolean;

/**
 * Returns a decision that is made once per survey model, on its first
 * `onComplete`. survey-core's "Try again" calls `saveDataOnComplete()` with no
 * trigger, so a later call reuses the first answer instead of deciding again.
 * Assumes a model is completed once, as the public form does.
 */
export function createScreenOutDecision(): ScreenOutDecision {
  const decided = new WeakMap<CompletingSurvey, boolean>();

  return (survey, event) => {
    const previous = decided.get(survey);
    if (previous !== undefined) {
      return previous;
    }

    const isScreenOut = decideScreenOut(survey, event);
    decided.set(survey, isScreenOut);
    return isScreenOut;
  };
}

/**
 * A screen-out trigger that ended the survey is a screen-out. When a Complete
 * trigger ended it, a screen-out condition that also holds wins, because
 * `completedTrigger` returns whichever trigger was recorded first. A normal
 * finish (no trigger) is never a screen-out: SurveyJS runs a trigger only when
 * a value it reads changes, so re-running conditions there would also count
 * negated conditions on unanswered or hidden questions.
 */
function decideScreenOut(
  survey: CompletingSurvey,
  event: CompletingEvent,
): boolean {
  if (isScreenOutTrigger(event.completeTrigger)) {
    return true;
  }

  if (!event.isCompleteOnTrigger) {
    return false;
  }

  return survey.triggers.some(
    (trigger) =>
      isScreenOutTrigger(trigger) &&
      Boolean(trigger.expression) &&
      survey.runCondition(trigger.expression as string),
  );
}
