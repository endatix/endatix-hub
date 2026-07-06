import { Serializer, SurveyModel } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import {
  isCarryForwardChoicesSectionVisible,
  isCarryForwardFeatureVisible,
} from "../carry-forward-properties";
import {
  CARRY_FORWARD_CHOICES_CATEGORY,
  CARRY_FORWARD_ENABLED_PROPERTY,
  CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  CARRY_FORWARD_MODE_PROPERTY,
  CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  CARRY_FORWARD_QUESTION_TYPES,
  CARRY_FORWARD_SOURCES_PROPERTY,
} from "../constants";
import { registerDataListGlobals } from "@/lib/survey-features/data-lists/infrastructure/registry";
import { DATA_LIST_PROPERTY_NAME } from "@/lib/survey-features/data-lists/constants";
import { CARRY_FORWARD_MODE_VALUES } from "../carry-forward-mode-values";
import {
  registerAdvancedCarryForwardGlobals,
  resetAdvancedCarryForwardRegistryForTests,
} from "../infrastructure/registry";

const CARRY_FORWARD_SECTION_DEPENDS_ON = [
  DATA_LIST_PROPERTY_NAME,
  "choicesByUrl",
  "choicesFromQuestion",
] as const;

const CARRY_FORWARD_FEATURE_DEPENDS_ON = [
  CARRY_FORWARD_ENABLED_PROPERTY,
  ...CARRY_FORWARD_SECTION_DEPENDS_ON,
] as const;

const EXPECTED_PROPERTY_NAMES = [
  CARRY_FORWARD_ENABLED_PROPERTY,
  CARRY_FORWARD_SOURCES_PROPERTY,
  CARRY_FORWARD_MODE_PROPERTY,
  CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  CARRY_FORWARD_MAX_CHOICES_PROPERTY,
] as const;

function getPropertyChoices(
  questionType: string,
  propertyName: string,
  obj: Record<string, unknown>,
): Promise<Array<{ value: string; text: string }>> {
  const property = Serializer.findProperty(questionType, propertyName) as {
    choicesfunc?: (
      questionObj: Record<string, unknown>,
      callback: (choices: Array<{ value: string; text: string }>) => void,
    ) => void;
  } | null;

  return new Promise((resolve) => {
    property?.choicesfunc?.(obj, resolve);
  });
}

describe("registerAdvancedCarryForwardGlobals", () => {
  beforeAll(() => {
    registerAdvancedCarryForwardGlobals();
    registerDataListGlobals();
  });

  describe("Serializer properties on SelectBase question types", () => {
    it.each(CARRY_FORWARD_QUESTION_TYPES)(
      "registers all carry-forward properties on %s",
      (questionType) => {
        for (const propertyName of EXPECTED_PROPERTY_NAMES) {
          const property = Serializer.findProperty(questionType, propertyName);
          expect(property, `property ${propertyName}`).toBeDefined();
          expect(property?.category).toBe(
            CARRY_FORWARD_CHOICES_CATEGORY,
          );
        }
      },
    );

    it("registers sources as multiplevalues with dynamic choices", () => {
      const property = Serializer.findProperty(
        "checkbox",
        CARRY_FORWARD_SOURCES_PROPERTY,
      ) as { type?: string; choicesfunc?: unknown } | null;

      expect(property?.type).toBe("multiplevalues");
      expect(property?.choicesfunc).toBeTypeOf("function");
    });

    it("registers enabled toggle with dependsOn conflicting choice sources", () => {
      const property = Serializer.findProperty(
        "checkbox",
        CARRY_FORWARD_ENABLED_PROPERTY,
      );

      expect(property?.dependsOn).toEqual([
        ...CARRY_FORWARD_SECTION_DEPENDS_ON,
      ]);
    });

    it("registers priority items with dependsOn enabled, sources, and conflicts", () => {
      const property = Serializer.findProperty(
        "checkbox",
        CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
      );

      expect(property?.type).toBe("multiplevalues");
      expect(property?.dependsOn).toEqual([
        ...CARRY_FORWARD_FEATURE_DEPENDS_ON,
        CARRY_FORWARD_SOURCES_PROPERTY,
      ]);
    });

    it("registers dependent properties with dependsOn enabled toggle and conflicts", () => {
      for (const propertyName of [
        CARRY_FORWARD_SOURCES_PROPERTY,
        CARRY_FORWARD_MODE_PROPERTY,
        CARRY_FORWARD_MAX_CHOICES_PROPERTY,
      ]) {
        const property = Serializer.findProperty("checkbox", propertyName);
        expect(property?.dependsOn).toEqual([
          ...CARRY_FORWARD_FEATURE_DEPENDS_ON,
        ]);
      }
    });

    it("registers mode as string with native all/selected/unselected choices", () => {
      const property = Serializer.findProperty(
        "checkbox",
        CARRY_FORWARD_MODE_PROPERTY,
      );

      expect(property?.type).toBe("string");
      expect(property?.displayName).toBe("Which choice options to copy");
      expect(property?.choices).toEqual([
        ...CARRY_FORWARD_MODE_VALUES,
      ]);
    });

    it("registers max choices as number with default 0", () => {
      const property = Serializer.findProperty(
        "checkbox",
        CARRY_FORWARD_MAX_CHOICES_PROPERTY,
      );

      expect(property?.type).toBe("number");
      expect(property?.minValue).toBe(0);
    });
  });

  describe("mutual exclusion visibleIf", () => {
    it("hides carry-forward settings when data list is bound", () => {
      expect(
        isCarryForwardChoicesSectionVisible({
          edxDataListId: "list-1",
        }),
      ).toBe(false);
    });

    it("hides carry-forward settings when choicesByUrl is set", () => {
      expect(
        isCarryForwardChoicesSectionVisible({
          choicesByUrl: { url: "https://example.com" },
        }),
      ).toBe(false);
    });

    it("shows carry-forward settings when choicesByUrl object has no url", () => {
      expect(
        isCarryForwardChoicesSectionVisible({
          choicesByUrl: { url: "" },
        }),
      ).toBe(true);
    });

    it("hides carry-forward settings when choicesFromQuestion is set", () => {
      expect(
        isCarryForwardChoicesSectionVisible({
          choicesFromQuestion: "q1",
        }),
      ).toBe(false);
    });

    it("shows carry-forward settings when no conflicting choice source is set", () => {
      expect(isCarryForwardChoicesSectionVisible({})).toBe(true);
    });

    it("hides dependent properties when carry forward is disabled", () => {
      expect(
        isCarryForwardFeatureVisible({
          advancedCarryForwardEnabled: false,
        }),
      ).toBe(false);
    });

    it("hides data list property when Carry forward is enabled", () => {
      const dataListProperty = Serializer.findProperty(
        "dropdown",
        DATA_LIST_PROPERTY_NAME,
      );

      expect(
        dataListProperty?.visibleIf?.({
          advancedCarryForwardEnabled: true,
        }),
      ).toBe(false);
      expect(
        dataListProperty?.visibleIf?.({
          advancedCarryForwardEnabled: false,
        }),
      ).toBe(true);
    });

    it("shows carry-forward category for a plain checkbox question", () => {
      const survey = new SurveyModel({
        elements: [
          {
            type: "checkbox",
            name: "choicesDestination",
            choices: ["Item 1", "Item 2", "Item 3"],
          },
        ],
      });

      const question = survey.getQuestionByName("choicesDestination");
      const enabledProperty = Serializer.findProperty(
        "checkbox",
        CARRY_FORWARD_ENABLED_PROPERTY,
      );

      expect(isCarryForwardChoicesSectionVisible(question as never)).toBe(true);
      expect(enabledProperty?.visibleIf?.(question)).toBe(true);
    });

    it("hides native copy choices from when Carry forward is enabled", () => {
      const choicesFromQuestionProperty = Serializer.findProperty(
        "checkbox",
        "choicesFromQuestion",
      );

      expect(
        choicesFromQuestionProperty?.visibleIf?.({
          advancedCarryForwardEnabled: true,
        }),
      ).toBe(false);
      expect(
        choicesFromQuestionProperty?.visibleIf?.({
          advancedCarryForwardEnabled: false,
        }),
      ).toBe(true);
    });

    it("hides choices by url when Carry forward is enabled", () => {
      const choicesByUrlProperty = Serializer.findProperty(
        "checkbox",
        "choicesByUrl",
      );

      expect(
        choicesByUrlProperty?.visibleIf?.({
          advancedCarryForwardEnabled: true,
        }),
      ).toBe(false);
      expect(
        choicesByUrlProperty?.visibleIf?.({
          advancedCarryForwardEnabled: false,
        }),
      ).toBe(true);
    });

    it("hides inline choices editor when Carry forward is enabled", () => {
      const choicesProperty = Serializer.findProperty("checkbox", "choices");

      expect(
        choicesProperty?.visibleIf?.({
          advancedCarryForwardEnabled: true,
        }),
      ).toBe(false);
      expect(
        choicesProperty?.visibleIf?.({
          advancedCarryForwardEnabled: false,
        }),
      ).toBe(true);
    });

    it("re-evaluates data list visibility when carry-forward flag toggles via dependsOn", () => {
      const dataListProperty = Serializer.findProperty(
        "dropdown",
        DATA_LIST_PROPERTY_NAME,
      );

      expect(dataListProperty?.dependsOn).toEqual([
        "choicesFromQuestion",
        "advancedCarryForwardEnabled",
      ]);
    });
  });

  describe("dynamic picker callbacks", () => {
    it("returns select-base source questions excluding self", async () => {
      const survey = new SurveyModel({
        elements: [
          {
            type: "checkbox",
            name: "brands",
            choices: ["A", "B"],
          },
          {
            type: "radiogroup",
            name: "colors",
            choices: ["Red", "Blue"],
          },
          {
            type: "checkbox",
            name: "target",
            choices: ["X"],
          },
        ],
      });

      const target = survey.getQuestionByName("target");
      const choices = await getPropertyChoices(
        "checkbox",
        CARRY_FORWARD_SOURCES_PROPERTY,
        {
          survey,
          name: target.name,
        },
      );

      expect(choices.map((choice) => choice.value)).toEqual([
        "brands",
        "colors",
      ]);
    });

    it("returns union of source choices for priority picker", async () => {
      const survey = new SurveyModel({
        elements: [
          {
            type: "checkbox",
            name: "brands",
            choices: ["A", "B"],
          },
          {
            type: "radiogroup",
            name: "colors",
            choices: ["Red", "Blue"],
          },
          {
            type: "checkbox",
            name: "target",
            choices: ["X"],
            advancedCarryForwardSources: ["brands", "colors"],
          },
        ],
      });

      const target = survey.getQuestionByName("target");
      const choices = await getPropertyChoices(
        "checkbox",
        CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
        {
          survey,
          advancedCarryForwardSources: target.advancedCarryForwardSources,
        },
      );

      expect(choices).toEqual(
        expect.arrayContaining([
          { value: "A", text: "brands: (A)" },
          { value: "B", text: "brands: (B)" },
          { value: "Red", text: "colors: (Red)" },
          { value: "Blue", text: "colors: (Blue)" },
        ]),
      );
      expect(choices).toHaveLength(4);
    });
  });

  it("is idempotent", () => {
    expect(() => registerAdvancedCarryForwardGlobals()).not.toThrow();
  });

  it("resetAdvancedCarryForwardRegistryForTests clears serializer metadata", () => {
    resetAdvancedCarryForwardRegistryForTests();

    expect(
      Serializer.findProperty(
        "checkbox",
        CARRY_FORWARD_ENABLED_PROPERTY,
      ),
    ).toBeUndefined();

    registerAdvancedCarryForwardGlobals();
  });

  it("restores native choice-source visibility on reset (no wrapper stacking)", () => {
    resetAdvancedCarryForwardRegistryForTests();

    const property = Serializer.findProperty("checkbox", "choicesFromQuestion");
    const baselineVisibleIf = property?.visibleIf;

    registerAdvancedCarryForwardGlobals();
    const configuredProperty = Serializer.findProperty(
      "checkbox",
      "choicesFromQuestion",
    );
    expect(
      configuredProperty?.visibleIf?.({
        advancedCarryForwardEnabled: true,
      }),
    ).toBe(false);

    resetAdvancedCarryForwardRegistryForTests();
    const restoredProperty = Serializer.findProperty(
      "checkbox",
      "choicesFromQuestion",
    );
    expect(restoredProperty?.visibleIf).toBe(baselineVisibleIf);
    expect(
      restoredProperty?.visibleIf?.({
        advancedCarryForwardEnabled: true,
      }),
    ).not.toBe(false);

    registerAdvancedCarryForwardGlobals();
    resetAdvancedCarryForwardRegistryForTests();
    registerAdvancedCarryForwardGlobals();
  });
});
