import type { SurveyModel, ValueChangedEvent } from "survey-core";
import {
  CARRY_FORWARD_ENABLED_PROPERTY,
  CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  CARRY_FORWARD_MODE_PROPERTY,
  CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  CARRY_FORWARD_SOURCES_PROPERTY,
} from "../constants";
import type { AdvancedCarryForwardQuestion } from "../types";
import {
  getCarryForwardTargetsInDependencyOrder,
  getDownstreamCarryForwardTargets,
  orderCarryForwardTargetsByDependencies,
} from "../utils/carry-forward-graph";
import { syncSingleCarryForwardTarget } from "../use-cases/sync-carry-forward-target";

export const CARRY_FORWARD_CONTROL_PROPS = new Set([
  CARRY_FORWARD_ENABLED_PROPERTY,
  CARRY_FORWARD_SOURCES_PROPERTY,
  CARRY_FORWARD_MODE_PROPERTY,
  CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  CARRY_FORWARD_MAX_CHOICES_PROPERTY,
]);

const updatingCarryForwardSurveys = new Set<SurveyModel>();

function syncEachCarryForwardTarget(
  survey: SurveyModel,
  targets: AdvancedCarryForwardQuestion[],
): boolean {
  let changed = false;
  for (const target of targets) {
    changed = syncSingleCarryForwardTarget(survey, target) || changed;
  }
  return changed;
}

/**
 * Re-runs the survey's expressions after carried choices changed with no value
 * change. SurveyJS computes calculated values and expressions when the model
 * finishes loading and on each value change, so without this `displayValue()`
 * and similar functions keep reading the old choices.
 *
 * Source answer changes do not need it: SurveyJS runs conditions after it
 * updates the depended targets.
 */
function runExpressionsWhenChanged(
  survey: SurveyModel,
  changed: boolean,
): void {
  if (changed) {
    survey.runExpressions();
  }
}

/**
 * Syncs targets in dependency order under the re-entrancy guard.
 *
 * @returns whether any target's choices changed; `false` also when the guard
 * skipped the call or there were no targets.
 */
export function syncCarryForwardTargets(
  survey: SurveyModel,
  targets: AdvancedCarryForwardQuestion[],
): boolean {
  if (updatingCarryForwardSurveys.has(survey) || targets.length === 0) {
    return false;
  }

  updatingCarryForwardSurveys.add(survey);

  try {
    return syncEachCarryForwardTarget(
      survey,
      orderCarryForwardTargetsByDependencies(survey, targets),
    );
  } finally {
    updatingCarryForwardSurveys.delete(survey);
  }
}

/**
 * Syncs targets that were just bound to the survey (initial bind, a new loop
 * panel), in the given order and outside the re-entrancy guard, then re-runs
 * the survey's expressions when their choices changed.
 */
export function syncNewCarryForwardTargets(
  survey: SurveyModel,
  targets: AdvancedCarryForwardQuestion[],
): void {
  runExpressionsWhenChanged(
    survey,
    syncEachCarryForwardTarget(survey, targets),
  );
}

export function syncAllCarryForwardTargets(survey: SurveyModel): void {
  syncCarryForwardTargets(
    survey,
    getCarryForwardTargetsInDependencyOrder(survey),
  );
}

export function loadCarryForwardTargets(
  sender: SurveyModel,
  options: ValueChangedEvent,
): void {
  if (updatingCarryForwardSurveys.has(sender)) {
    return;
  }

  const targetsToUpdate = getDownstreamCarryForwardTargets(
    sender,
    options.name,
  );
  syncCarryForwardTargets(sender, targetsToUpdate);
}

/**
 * Re-syncs when carry-forward control properties change on a target (Creator /
 * setPropertyValue). Source value changes are handled by SurveyJS depended-question
 * notifications — see carry-forward-dependencies.ts.
 */
export function loadCarryForwardTargetsFromPropertyChange(
  survey: SurveyModel,
  changedTarget: AdvancedCarryForwardQuestion,
  propertyName: string,
): void {
  if (!CARRY_FORWARD_CONTROL_PROPS.has(propertyName)) {
    return;
  }

  const targetsToUpdate = orderCarryForwardTargetsByDependencies(survey, [
    changedTarget,
    ...getDownstreamCarryForwardTargets(survey, changedTarget.name),
  ]);

  runExpressionsWhenChanged(
    survey,
    syncCarryForwardTargets(survey, targetsToUpdate),
  );
}

export function resetCarryForwardUpdateGuardForTests(): void {
  updatingCarryForwardSurveys.clear();
}
