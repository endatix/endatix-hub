import { Serializer, SvgRegistry } from 'survey-core';
import { ADVANCED_CARRY_FORWARD_PROPERTIES } from '../carry-forward-properties';
import {
  ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  ADVANCED_CARRY_FORWARD_ICON_NAME,
  ADVANCED_CARRY_FORWARD_ICON_SVG,
  ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
  ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  ADVANCED_CARRY_FORWARD_QUESTION_TYPES,
  ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
} from '../constants';

const CARRY_FORWARD_PROPERTY_NAMES = [
  ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
  ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
  ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
] as const;

let isAdvancedCarryForwardRegistryInitialized = false;

function hasAdvancedCarryForwardSerializerProperties(): boolean {
  return CARRY_FORWARD_PROPERTY_NAMES.every((propertyName) =>
    Boolean(
      Serializer.findProperty(
        ADVANCED_CARRY_FORWARD_QUESTION_TYPES[0],
        propertyName,
      ),
    ),
  );
}

/**
 * Registers Creator-visible Advanced Carry Forward metadata on SelectBase types.
 * Must run before SurveyCreator or SurveyModel initializes JSON metadata.
 */
export function registerAdvancedCarryForwardGlobals(): void {
  if (
    isAdvancedCarryForwardRegistryInitialized &&
    hasAdvancedCarryForwardSerializerProperties()
  ) {
    return;
  }

  for (const questionType of ADVANCED_CARRY_FORWARD_QUESTION_TYPES) {
    Serializer.addProperties(questionType, ADVANCED_CARRY_FORWARD_PROPERTIES);
  }

  SvgRegistry.registerIcon(
    ADVANCED_CARRY_FORWARD_ICON_NAME,
    ADVANCED_CARRY_FORWARD_ICON_SVG,
  );

  isAdvancedCarryForwardRegistryInitialized = true;
}

export function resetAdvancedCarryForwardRegistryForTests(): void {
  for (const questionType of ADVANCED_CARRY_FORWARD_QUESTION_TYPES) {
    for (const propertyName of CARRY_FORWARD_PROPERTY_NAMES) {
      if (Serializer.findProperty(questionType, propertyName)) {
        Serializer.removeProperty(questionType, propertyName);
      }
    }
  }

  isAdvancedCarryForwardRegistryInitialized = false;
}
