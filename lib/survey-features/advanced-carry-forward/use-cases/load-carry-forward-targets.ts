import type { SurveyModel, ValueChangedEvent } from 'survey-core';
import {
  ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
  ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
} from '../constants';
import { getAllCarryForwardTargets } from './carry-forward-question-utils';
import { syncSingleCarryForwardTarget } from './sync-carry-forward-target';

const CARRY_FORWARD_CONTROL_PROPS = new Set([
  ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
  ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
  ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
]);

let isUpdatingCarryForward = false;

export function loadCarryForwardTargets(
  sender: SurveyModel,
  options: ValueChangedEvent,
): void {
  if (isUpdatingCarryForward) {
    return;
  }

  const carryForwardTargets = getAllCarryForwardTargets(sender);
  const targetsToUpdate = carryForwardTargets.filter(
    (target) =>
      target.advancedCarryForwardSources?.includes(options.name) ||
      target.name === options.name ||
      CARRY_FORWARD_CONTROL_PROPS.has(options.name),
  );

  if (targetsToUpdate.length === 0) {
    return;
  }

  isUpdatingCarryForward = true;

  targetsToUpdate.forEach((target) => {
    syncSingleCarryForwardTarget(sender, target);
  });

  isUpdatingCarryForward = false;
}

export function resetCarryForwardUpdateGuardForTests(): void {
  isUpdatingCarryForward = false;
}
