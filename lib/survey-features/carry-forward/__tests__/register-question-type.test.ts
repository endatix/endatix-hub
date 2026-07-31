import { Serializer } from "survey-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CARRY_FORWARD_ENABLED_PROPERTY,
  CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  CARRY_FORWARD_MODE_PROPERTY,
  CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  CARRY_FORWARD_QUESTION_TYPES,
  CARRY_FORWARD_SOURCES_PROPERTY,
} from "../constants";
import {
  registerAdvancedCarryForwardGlobals,
  registerCarryForwardForQuestionType,
  resetAdvancedCarryForwardRegistryForTests,
} from "../infrastructure/registry";
import { isSupportedCarryForwardQuestionType } from "../supported-question-types";

const CARRY_FORWARD_PROPERTIES = [
  CARRY_FORWARD_ENABLED_PROPERTY,
  CARRY_FORWARD_SOURCES_PROPERTY,
  CARRY_FORWARD_MODE_PROPERTY,
  CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  CARRY_FORWARD_MAX_CHOICES_PROPERTY,
];

const CUSTOM_TYPE = "testcarryforwardquestion";

function registerCustomQuestionClass(): void {
  if (!Serializer.findClass(CUSTOM_TYPE)) {
    Serializer.addClass(
      CUSTOM_TYPE,
      [{ name: "dummy:boolean" }],
      undefined,
      "selectbase",
    );
  }
}

describe("registerCarryForwardForQuestionType", () => {
  beforeEach(() => {
    resetAdvancedCarryForwardRegistryForTests();
  });

  afterEach(() => {
    resetAdvancedCarryForwardRegistryForTests();
    vi.restoreAllMocks();
  });

  it("registers all carry forward properties on an opted-in type", () => {
    // Arrange
    registerCustomQuestionClass();

    // Act
    registerCarryForwardForQuestionType(CUSTOM_TYPE);

    // Assert
    for (const propertyName of CARRY_FORWARD_PROPERTIES) {
      expect(Serializer.findProperty(CUSTOM_TYPE, propertyName)).toBeDefined();
    }
  });

  it("marks the type as supported at runtime", () => {
    // Arrange
    registerCustomQuestionClass();

    // Act
    registerCarryForwardForQuestionType(CUSTOM_TYPE);

    // Assert
    expect(isSupportedCarryForwardQuestionType(CUSTOM_TYPE)).toBe(true);
  });

  it("refuses to register before the class exists, and warns", () => {
    // Arrange — SurveyJS silently discards properties for unknown classes,
    // so registering early would fail invisibly.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Act
    registerCarryForwardForQuestionType("neverregisteredtype");

    // Assert
    expect(warn).toHaveBeenCalledOnce();
    expect(
      Serializer.findProperty(
        "neverregisteredtype",
        CARRY_FORWARD_ENABLED_PROPERTY,
      ),
    ).toBeFalsy();
    expect(isSupportedCarryForwardQuestionType("neverregisteredtype")).toBe(
      false,
    );
  });

  it("is idempotent", () => {
    // Arrange
    registerCustomQuestionClass();

    // Act & Assert
    registerCarryForwardForQuestionType(CUSTOM_TYPE);
    expect(() => registerCarryForwardForQuestionType(CUSTOM_TYPE)).not.toThrow();
    expect(
      Serializer.findProperty(CUSTOM_TYPE, CARRY_FORWARD_ENABLED_PROPERTY),
    ).toBeDefined();
  });

  it("hides native choice sources on the opted-in type", () => {
    // Arrange
    registerCustomQuestionClass();

    // Act
    registerCarryForwardForQuestionType(CUSTOM_TYPE);
    const choicesFromQuestion = Serializer.findProperty(
      CUSTOM_TYPE,
      "choicesFromQuestion",
    );

    // Assert — native carry forward is hidden while the advanced one is on
    expect(
      choicesFromQuestion?.visibleIf?.({ edxCarryForwardEnabled: true }),
    ).toBe(false);
  });

  it("leaves the built-in types working exactly as before", () => {
    // Arrange
    registerCustomQuestionClass();

    // Act — opting a custom type in must not disturb the built-in list
    registerCarryForwardForQuestionType(CUSTOM_TYPE);
    registerAdvancedCarryForwardGlobals();

    // Assert
    for (const questionType of CARRY_FORWARD_QUESTION_TYPES) {
      for (const propertyName of CARRY_FORWARD_PROPERTIES) {
        expect(
          Serializer.findProperty(questionType, propertyName),
        ).toBeDefined();
      }
    }
  });

  it("does not warn on repeat init when a custom type is registered", () => {
    // Arrange — the one-time-init guard asserts over built-in types only, so
    // an opted-in type must not make it think metadata went missing.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    registerCustomQuestionClass();

    // Act
    registerAdvancedCarryForwardGlobals();
    registerCarryForwardForQuestionType(CUSTOM_TYPE);
    registerAdvancedCarryForwardGlobals();

    // Assert
    expect(warn).not.toHaveBeenCalled();
  });
});
