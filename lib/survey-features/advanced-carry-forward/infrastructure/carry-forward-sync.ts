import type { SurveyModel, ValueChangedEvent } from "survey-core";
import {
  ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
  ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
} from "../constants";
import type { AdvancedCarryForwardQuestion } from "../types";
import {
  getCarryForwardTargetsInDependencyOrder,
  getDownstreamCarryForwardTargets,
  orderCarryForwardTargetsByDependencies,
} from "../utils/carry-forward-graph";
import { syncSingleCarryForwardTarget } from "../use-cases/sync-carry-forward-target";

export const CARRY_FORWARD_CONTROL_PROPS = new Set([
  ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
  ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
  ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
]);

const updatingCarryForwardSurveys = new Set<SurveyModel>();

export function syncCarryForwardTargets(
  survey: SurveyModel,
  targets: AdvancedCarryForwardQuestion[],
): void {
  if (updatingCarryForwardSurveys.has(survey) || targets.length === 0) {
    return;
  }

  updatingCarryForwardSurveys.add(survey);

  try {
    orderCarryForwardTargetsByDependencies(survey, targets).forEach(
      (target) => {
        syncSingleCarryForwardTarget(survey, target);
      },
    );
  } finally {
    updatingCarryForwardSurveys.delete(survey);
  }
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

  syncCarryForwardTargets(survey, targetsToUpdate);
}

export function resetCarryForwardUpdateGuardForTests(): void {
  updatingCarryForwardSurveys.clear();
}
