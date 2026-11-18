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

/**
 * Syncs targets in dependency order.
 *
 * @returns whether any target's choices changed.
 */
export function syncCarryForwardTargets(
  survey: SurveyModel,
  targets: AdvancedCarryForwardQuestion[],
): boolean {
  if (updatingCarryForwardSurveys.has(survey) || targets.length === 0) {
    return false;
  }

  updatingCarryForwardSurveys.add(survey);

  let changed = false;
  try {
    for (const target of orderCarryForwardTargetsByDependencies(
      survey,
      targets,
    )) {
      changed = syncSingleCarryForwardTarget(survey, target) || changed;
    }
  } finally {
    updatingCarryForwardSurveys.delete(survey);
  }

  return changed;
}

/**
 * Syncs targets, then re-runs the survey's expressions when their choices
 * changed. SurveyJS computes calculated values and expressions when the model
 * finishes loading and on each value change, so choices carried forward with no
 * value change (initial bind, a new loop panel, a settings change) would leave
 * `displayValue()` and similar functions on the old choices.
 *
 * Source answer changes do not need this: SurveyJS runs conditions right after
 * it updates the depended targets.
 */
export function syncCarryForwardTargetsAndRunExpressions(
  survey: SurveyModel,
  targets: AdvancedCarryForwardQuestion[],
): void {
  if (syncCarryForwardTargets(survey, targets)) {
    survey.runExpressions();
  }
}

export function syncAllCarryForwardTargets(survey: SurveyModel): void {
  syncCarryForwardTargetsAndRunExpressions(
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

  syncCarryForwardTargetsAndRunExpressions(survey, targetsToUpdate);
}

export function resetCarryForwardUpdateGuardForTests(): void {
  updatingCarryForwardSurveys.clear();
}
