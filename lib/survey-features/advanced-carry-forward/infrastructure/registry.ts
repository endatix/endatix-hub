import { Serializer } from 'survey-core';
import { ADVANCED_CARRY_FORWARD_PROPERTIES } from '../carry-forward-properties';
import {
  ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
  ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  ADVANCED_CARRY_FORWARD_QUESTION_TYPES,
  ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
} from '../constants';
import type { CarryForwardVisibleQuestion } from '../types';

const CARRY_FORWARD_PROPERTY_NAMES = [
  ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
  ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
  ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
] as const;

const NATIVE_CHOICE_PROPERTIES_TO_HIDE = [
  'choicesFromQuestion',
  'choices',
] as const;

type SerializerProperty = {
  visibleIf?: (obj: CarryForwardVisibleQuestion) => boolean;
  dependsOn?: string | string[];
};

type NativePropertySnapshot = {
  originalVisibleIf?: (obj: CarryForwardVisibleQuestion) => boolean;
  originalDependsOn?: string | string[];
};

let isAdvancedCarryForwardRegistryInitialized = false;
const patchedNativeProperties = new Map<SerializerProperty, NativePropertySnapshot>();

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

function appendDependsOn(
  property: { dependsOn?: string | string[] },
  dependency: string,
): void {
  if (Array.isArray(property.dependsOn)) {
    if (!property.dependsOn.includes(dependency)) {
      property.dependsOn = [...property.dependsOn, dependency];
    }
    return;
  }

  if (property.dependsOn) {
    property.dependsOn = [property.dependsOn, dependency];
    return;
  }

  property.dependsOn = [dependency];
}

function hideNativeChoicePropertyWhenCarryForwardEnabled(
  property: SerializerProperty,
): void {
  if (patchedNativeProperties.has(property)) {
    return;
  }

  const snapshot: NativePropertySnapshot = {
    originalVisibleIf: property.visibleIf,
    originalDependsOn: property.dependsOn,
  };
  patchedNativeProperties.set(property, snapshot);

  property.visibleIf = (obj) => {
    if (obj.advancedCarryForwardEnabled === true) {
      return false;
    }

    if (snapshot.originalVisibleIf) {
      return snapshot.originalVisibleIf(obj);
    }

    return true;
  };

  appendDependsOn(property, ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY);
}

function configureNativeChoiceSourceMutualExclusion(): void {
  const wrappedPropertyObjects = new Set<SerializerProperty>();

  for (const questionType of ADVANCED_CARRY_FORWARD_QUESTION_TYPES) {
    for (const propertyName of NATIVE_CHOICE_PROPERTIES_TO_HIDE) {
      const property = Serializer.findProperty(
        questionType,
        propertyName,
      ) as SerializerProperty | null;

      if (!property || wrappedPropertyObjects.has(property)) {
        continue;
      }

      wrappedPropertyObjects.add(property);
      hideNativeChoicePropertyWhenCarryForwardEnabled(property);
    }
  }
}

function restoreNativeChoiceSourceMutualExclusion(): void {
  for (const [property, snapshot] of patchedNativeProperties) {
    property.visibleIf = snapshot.originalVisibleIf;
    property.dependsOn = snapshot.originalDependsOn;
  }

  patchedNativeProperties.clear();
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

  configureNativeChoiceSourceMutualExclusion();

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

  restoreNativeChoiceSourceMutualExclusion();
  isAdvancedCarryForwardRegistryInitialized = false;
}
