import { Serializer } from "survey-core";

import { CARRY_FORWARD_PROPERTIES } from "../carry-forward-properties";
import {
  CARRY_FORWARD_ENABLED_PROPERTY,
  CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  CARRY_FORWARD_MODE_PROPERTY,
  CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  CARRY_FORWARD_QUESTION_TYPES,
  CARRY_FORWARD_SOURCES_PROPERTY,
} from "../constants";
import type { CarryForwardVisibleQuestion } from "../types";

const CARRY_FORWARD_PROPERTY_NAMES = [
  CARRY_FORWARD_ENABLED_PROPERTY,
  CARRY_FORWARD_SOURCES_PROPERTY,
  CARRY_FORWARD_MODE_PROPERTY,
  CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  CARRY_FORWARD_MAX_CHOICES_PROPERTY,
] as const;

/** Safe to extend via `Serializer.addProperty` (does not replace choice item types). */
const NATIVE_CHOICE_SOURCE_PROPERTIES_TO_HIDE = [
  "choicesFromQuestion",
  "choicesByUrl",
] as const;

/**
 * Inline `choices` must be visibility-patched in place. `addProperty('choices')`
 * replaces per-type item schemas (e.g. imagepicker loses `imageLink`).
 */
const INLINE_CHOICES_PROPERTY = "choices";

type SerializerProperty = {
  visibleIf?: (obj: CarryForwardVisibleQuestion) => boolean;
  dependsOn?: string | string[];
};

type InlineChoicesPropertySnapshot = {
  originalVisibleIf?: (obj: CarryForwardVisibleQuestion) => boolean;
  originalDependsOn?: string | string[];
};

/**
 * One-time Serializer registration for Carry forward.
 *
 * Call `registerAdvancedCarryForwardGlobals()` exactly once per app session
 * (via the survey extension `onInit` hook) before any SurveyModel / Creator
 * instance is created.
 *
 * In tests, pair with `resetAdvancedCarryForwardRegistryForTests()` in
 * beforeEach/afterEach — do not call register again in dev without reset.
 */
let isAdvancedCarryForwardRegistryInitialized = false;
const configuredNativePropertyKeys = new Set<string>();
const patchedInlineChoicesProperties = new Map<
  SerializerProperty,
  InlineChoicesPropertySnapshot
>();

function hasAdvancedCarryForwardSerializerProperties(): boolean {
  return CARRY_FORWARD_QUESTION_TYPES.every((questionType) =>
    CARRY_FORWARD_PROPERTY_NAMES.every((propertyName) =>
      Boolean(Serializer.findProperty(questionType, propertyName)),
    ),
  );
}

function mergeDependsOn(
  dependsOn: string | string[] | undefined,
  dependency: string,
): string[] {
  if (!dependsOn) {
    return [dependency];
  }

  const dependencies = Array.isArray(dependsOn) ? dependsOn : [dependsOn];
  return dependencies.includes(dependency)
    ? dependencies
    : [...dependencies, dependency];
}

function appendDependsOn(
  property: { dependsOn?: string | string[] },
  dependency: string,
): void {
  property.dependsOn = mergeDependsOn(property.dependsOn, dependency);
}

function nativeChoicePropertyKey(
  questionType: string,
  propertyName: string,
): string {
  return `${questionType}:${propertyName}`;
}

function hideNativeChoiceSourceProperty(
  questionType: string,
  propertyName: string,
): void {
  const key = nativeChoicePropertyKey(questionType, propertyName);
  if (configuredNativePropertyKeys.has(key)) {
    return;
  }

  const existing = Serializer.findProperty(
    questionType,
    propertyName,
  ) as SerializerProperty | null;
  if (!existing) {
    return;
  }

  const originalVisibleIf = existing.visibleIf;

  Serializer.addProperty(questionType, {
    name: propertyName,
    dependsOn: mergeDependsOn(
      existing.dependsOn,
      CARRY_FORWARD_ENABLED_PROPERTY,
    ),
    visibleIf: (obj: CarryForwardVisibleQuestion) => {
      if (obj.edxCarryForwardEnabled === true) {
        return false;
      }

      if (originalVisibleIf) {
        return originalVisibleIf(obj);
      }

      return true;
    },
  });

  configuredNativePropertyKeys.add(key);
}

function patchInlineChoicesVisibility(property: SerializerProperty): void {
  if (patchedInlineChoicesProperties.has(property)) {
    return;
  }

  const snapshot: InlineChoicesPropertySnapshot = {
    originalVisibleIf: property.visibleIf,
    originalDependsOn: property.dependsOn,
  };
  patchedInlineChoicesProperties.set(property, snapshot);

  property.visibleIf = (obj: CarryForwardVisibleQuestion) => {
    if (obj.edxCarryForwardEnabled === true) {
      return false;
    }

    if (snapshot.originalVisibleIf) {
      return snapshot.originalVisibleIf(obj);
    }

    return true;
  };

  appendDependsOn(property, CARRY_FORWARD_ENABLED_PROPERTY);
}

function configureNativeChoiceSourceMutualExclusion(): void {
  const wrappedInlineChoices = new Set<SerializerProperty>();

  for (const questionType of CARRY_FORWARD_QUESTION_TYPES) {
    for (const propertyName of NATIVE_CHOICE_SOURCE_PROPERTIES_TO_HIDE) {
      hideNativeChoiceSourceProperty(questionType, propertyName);
    }

    const inlineChoicesProperty = Serializer.findProperty(
      questionType,
      INLINE_CHOICES_PROPERTY,
    ) as SerializerProperty | null;

    if (
      !inlineChoicesProperty ||
      wrappedInlineChoices.has(inlineChoicesProperty)
    ) {
      continue;
    }

    wrappedInlineChoices.add(inlineChoicesProperty);
    patchInlineChoicesVisibility(inlineChoicesProperty);
  }
}

function restoreNativeChoiceSourceMutualExclusion(): void {
  for (const key of configuredNativePropertyKeys) {
    const separatorIndex = key.indexOf(":");
    const questionType = key.slice(0, separatorIndex);
    const propertyName = key.slice(separatorIndex + 1);

    if (Serializer.findProperty(questionType, propertyName)) {
      Serializer.removeProperty(questionType, propertyName);
    }
  }

  configuredNativePropertyKeys.clear();

  for (const [property, snapshot] of patchedInlineChoicesProperties) {
    property.visibleIf = snapshot.originalVisibleIf;
    property.dependsOn = snapshot.originalDependsOn;
  }

  patchedInlineChoicesProperties.clear();
}

function assertOneTimeRegistryInit(): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (
    isAdvancedCarryForwardRegistryInitialized &&
    !hasAdvancedCarryForwardSerializerProperties()
  ) {
    console.warn(
      "[carry-forward] registerAdvancedCarryForwardGlobals: init flag is set but serializer metadata is missing. Call resetAdvancedCarryForwardRegistryForTests() before re-registering in tests.",
    );
  }
}

/**
 * Registers Creator-visible Carry forward metadata on SelectBase types.
 * Must run before SurveyCreator or SurveyModel initializes JSON metadata.
 */
export function registerAdvancedCarryForwardGlobals(): void {
  if (
    isAdvancedCarryForwardRegistryInitialized &&
    hasAdvancedCarryForwardSerializerProperties()
  ) {
    assertOneTimeRegistryInit();
    return;
  }

  if (isAdvancedCarryForwardRegistryInitialized) {
    assertOneTimeRegistryInit();
  }

  for (const questionType of CARRY_FORWARD_QUESTION_TYPES) {
    Serializer.addProperties(questionType, CARRY_FORWARD_PROPERTIES);
  }

  configureNativeChoiceSourceMutualExclusion();

  isAdvancedCarryForwardRegistryInitialized = true;
}

export function resetAdvancedCarryForwardRegistryForTests(): void {
  for (const questionType of CARRY_FORWARD_QUESTION_TYPES) {
    for (const propertyName of CARRY_FORWARD_PROPERTY_NAMES) {
      if (Serializer.findProperty(questionType, propertyName)) {
        Serializer.removeProperty(questionType, propertyName);
      }
    }
  }

  restoreNativeChoiceSourceMutualExclusion();
  isAdvancedCarryForwardRegistryInitialized = false;
}
