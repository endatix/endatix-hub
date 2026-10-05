import { Model } from "survey-core";
import { EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY } from "../constants";
import { readChangeNavigationOnComplete } from "../use-cases/read-change-navigation-on-complete";

/**
 * survey-core members this patch wraps. Private or protected in the typings,
 * present on the prototype at runtime. One cast here keeps the rest typed.
 */
interface SurveyNavigationInternals {
  completedByTriggers?: Record<string, unknown>;
  readonly canBeCompletedByTrigger: boolean;
  calcIsShowNextButton(): boolean;
  calcIsCompleteButtonVisible(): boolean;
  doCurrentPageComplete(doComplete: boolean): boolean;
  getPropertyValue(name: string): unknown;
}

let isPatchInstalled = false;

function replacesNextWithComplete(model: SurveyNavigationInternals): boolean {
  return readChangeNavigationOnComplete(
    model.getPropertyValue(EDX_CHANGE_NAVIGATION_ON_COMPLETE_PROPERTY),
  );
}

/**
 * Runs `calc` as if no Complete trigger had been recorded.
 *
 * `canBeCompletedByTrigger` derives from `completedByTriggers`, so hiding
 * that record for the duration of the call leaves survey-core's own button
 * expressions authoritative instead of reimplementing them here. The record
 * is restored immediately, which is what keeps the completion path and
 * `completedTrigger` attribution intact.
 */
function withoutRecordedTriggerCompletion<T>(
  model: SurveyNavigationInternals,
  calc: () => T,
): T {
  const recorded = model.completedByTriggers;
  model.completedByTriggers = undefined;
  try {
    return calc();
  } finally {
    model.completedByTriggers = recorded;
  }
}

/**
 * Hides a recorded Complete trigger from the navigation buttons only.
 *
 * Suppressing the calculations rather than `canBeCompleted` keeps
 * survey-core's `completedByTriggers` bookkeeping, so
 * `canBeCompleted(trigger, false)` still withdraws a record when the
 * expression stops being true. Shadowing `canBeCompleted` swallowed that
 * withdrawal and left Complete stuck on.
 */
type ButtonCalculation = (this: SurveyNavigationInternals) => boolean;

function suppressingRecordedCompletion(
  stock: ButtonCalculation,
): ButtonCalculation {
  return function (this: SurveyNavigationInternals): boolean {
    if (replacesNextWithComplete(this)) {
      return stock.call(this);
    }

    return withoutRecordedTriggerCompletion(this, () => stock.call(this));
  };
}

function patchButtonCalculations(proto: SurveyNavigationInternals): void {
  proto.calcIsShowNextButton = suppressingRecordedCompletion(
    proto.calcIsShowNextButton,
  );
  proto.calcIsCompleteButtonVisible = suppressingRecordedCompletion(
    proto.calcIsCompleteButtonVisible,
  );
}

/**
 * Completes on Next while the trigger holds.
 *
 * Button visibility is all `canBeCompletedByTrigger` drives; `nextPage()`
 * never reads it. Without this seam a Complete trigger that only references a
 * variable (a screenout fed by a URL or metadata value) leaves Next in place
 * and then advances past it, because `checkOnPageTriggers` passes only the
 * current page's question values as changed keys and skips the trigger.
 * Flipping the flag routes the Next click through the same validation and
 * `doComplete(canBeCompletedByTrigger, completedTrigger)` call the Complete
 * button would have used, so the completion keeps its trigger attribution.
 */
function patchNextCompletesScreenout(proto: SurveyNavigationInternals): void {
  const stockDoCurrentPageComplete = proto.doCurrentPageComplete;

  proto.doCurrentPageComplete = function (doComplete: boolean): boolean {
    const completeInsteadOfAdvancing =
      !doComplete &&
      !replacesNextWithComplete(this) &&
      this.canBeCompletedByTrigger;

    return stockDoCurrentPageComplete.call(
      this,
      doComplete || completeInsteadOfAdvancing,
    );
  };
}

/**
 * Teaches every survey to honor `edxChangeNavigationOnComplete`. Idempotent.
 *
 * Patched on `Model.prototype`, once, rather than bound per model. The value
 * is read live from the survey being rendered, so there is no bind order to
 * get wrong: a preview survey the Creator builds before any listener exists
 * is covered, and so is any surface added later. Omitted or `true` passes
 * straight through to survey-core, so forms that do not set the property are
 * untouched.
 */
export function installCompleteTriggerNavigationPatch(): void {
  if (isPatchInstalled) {
    return;
  }
  isPatchInstalled = true;

  const proto = Model.prototype as unknown as SurveyNavigationInternals;
  patchButtonCalculations(proto);
  patchNextCompletesScreenout(proto);
}
