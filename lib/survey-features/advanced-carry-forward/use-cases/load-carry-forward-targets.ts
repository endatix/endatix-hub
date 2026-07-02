import type { SurveyModel, ValueChangedEvent } from 'survey-core';
import {
  ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
  ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
} from '../constants';
import type { AdvancedCarryForwardQuestion } from '../types';
import {
  getAllCarryForwardTargets,
  getCarryForwardTargetsInDependencyOrder,
  orderCarryForwardTargetsByDependencies,
} from './carry-forward-question-utils';
import { syncSingleCarryForwardTarget } from './sync-carry-forward-target';

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
    orderCarryForwardTargetsByDependencies(survey, targets).forEach((target) => {
      syncSingleCarryForwardTarget(survey, target);
    });
  } finally {
    updatingCarryForwardSurveys.delete(survey);
  }
}

export function syncAllCarryForwardTargets(survey: SurveyModel): void {
  syncCarryForwardTargets(survey, getCarryForwardTargetsInDependencyOrder(survey));
}

export function loadCarryForwardTargets(
  sender: SurveyModel,
  options: ValueChangedEvent,
): void {
  if (updatingCarryForwardSurveys.has(sender)) {
    return;
  }

  const carryForwardTargets = getAllCarryForwardTargets(sender);
  const targetsToUpdate = carryForwardTargets.filter(
    (target) =>
      target.advancedCarryForwardSources?.includes(options.name) ||
      target.name === options.name,
  );

  syncCarryForwardTargets(sender, targetsToUpdate);
}

export function loadCarryForwardTargetsFromPropertyChange(
  survey: SurveyModel,
  propertyName: string,
): void {
  if (!CARRY_FORWARD_CONTROL_PROPS.has(propertyName)) {
    return;
  }

  syncAllCarryForwardTargets(survey);
}

export function resetCarryForwardUpdateGuardForTests(): void {
  updatingCarryForwardSurveys.clear();
}
