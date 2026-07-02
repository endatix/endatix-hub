import { Serializer, SurveyModel } from 'survey-core';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  isCarryForwardChoicesSectionVisible,
  isCarryForwardFeatureVisible,
} from '../carry-forward-properties';
import {
  ADVANCED_CARRY_FORWARD_CHOICES_CATEGORY,
  ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
  ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  ADVANCED_CARRY_FORWARD_QUESTION_TYPES,
  ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
} from '../constants';
import { registerDataListGlobals } from '@/lib/survey-features/data-lists/infrastructure/registry';
import { DATA_LIST_PROPERTY_NAME } from '@/lib/survey-features/data-lists/constants';
import { ADVANCED_CARRY_FORWARD_MODE_VALUES } from '../carry-forward-mode-values';
import {
  registerAdvancedCarryForwardGlobals,
  resetAdvancedCarryForwardRegistryForTests,
} from '../infrastructure/registry';

const EXPECTED_PROPERTY_NAMES = [
  ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
  ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
  ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
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

describe('registerAdvancedCarryForwardGlobals', () => {
  beforeAll(() => {
    registerAdvancedCarryForwardGlobals();
    registerDataListGlobals();
  });

  describe('Serializer properties on SelectBase question types', () => {
    it.each(ADVANCED_CARRY_FORWARD_QUESTION_TYPES)(
      'registers all carry-forward properties on %s',
      (questionType) => {
        for (const propertyName of EXPECTED_PROPERTY_NAMES) {
          const property = Serializer.findProperty(questionType, propertyName);
          expect(property, `property ${propertyName}`).toBeDefined();
          expect(property?.category).toBe(ADVANCED_CARRY_FORWARD_CHOICES_CATEGORY);
        }
      },
    );

    it('registers sources as multiplevalues with dynamic choices', () => {
      const property = Serializer.findProperty(
        'checkbox',
        ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
      ) as { type?: string; choicesfunc?: unknown } | null;

      expect(property?.type).toBe('multiplevalues');
      expect(property?.choicesfunc).toBeTypeOf('function');
    });

    it('registers priority items with dependsOn enabled and sources', () => {
      const property = Serializer.findProperty(
        'checkbox',
        ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
      );

      expect(property?.type).toBe('multiplevalues');
      expect(property?.dependsOn).toEqual([
        ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
        ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
      ]);
    });

    it('registers dependent properties with dependsOn enabled toggle', () => {
      for (const propertyName of [
        ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
        ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
        ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
      ]) {
        const property = Serializer.findProperty('checkbox', propertyName);
        expect(property?.dependsOn).toEqual([
          ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
        ]);
      }
    });

    it('registers mode as string with native all/selected/unselected choices', () => {
      const property = Serializer.findProperty(
        'checkbox',
        ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
      );

      expect(property?.type).toBe('string');
      expect(property?.displayName).toBe('Which choice options to copy');
      expect(property?.choices).toEqual([...ADVANCED_CARRY_FORWARD_MODE_VALUES]);
    });

    it('registers max choices as number with default 0', () => {
      const property = Serializer.findProperty(
        'checkbox',
        ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
      );

      expect(property?.type).toBe('number');
      expect(property?.minValue).toBe(0);
    });
  });

  describe('mutual exclusion visibleIf', () => {
    it('hides carry-forward settings when data list is bound', () => {
      expect(
        isCarryForwardChoicesSectionVisible({
          edxDataListId: 'list-1',
        }),
      ).toBe(false);
    });

    it('hides carry-forward settings when choicesByUrl is set', () => {
      expect(
        isCarryForwardChoicesSectionVisible({
          choicesByUrl: { url: 'https://example.com' },
        }),
      ).toBe(false);
    });

    it('shows carry-forward settings when choicesByUrl object has no url', () => {
      expect(
        isCarryForwardChoicesSectionVisible({
          choicesByUrl: { url: '' },
        }),
      ).toBe(true);
    });

    it('hides carry-forward settings when choicesFromQuestion is set', () => {
      expect(
        isCarryForwardChoicesSectionVisible({
          choicesFromQuestion: 'q1',
        }),
      ).toBe(false);
    });

    it('shows carry-forward settings when no conflicting choice source is set', () => {
      expect(isCarryForwardChoicesSectionVisible({})).toBe(true);
    });

    it('hides dependent properties when carry forward is disabled', () => {
      expect(
        isCarryForwardFeatureVisible({
          advancedCarryForwardEnabled: false,
        }),
      ).toBe(false);
    });

    it('hides data list property when advanced carry forward is enabled', () => {
      const dataListProperty = Serializer.findProperty(
        'dropdown',
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

    it('shows carry-forward category for a plain checkbox question', () => {
      const survey = new SurveyModel({
        elements: [
          {
            type: 'checkbox',
            name: 'choicesDestination',
            choices: ['Item 1', 'Item 2', 'Item 3'],
          },
        ],
      });

      const question = survey.getQuestionByName('choicesDestination');
      const enabledProperty = Serializer.findProperty(
        'checkbox',
        ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
      );

      expect(isCarryForwardChoicesSectionVisible(question as never)).toBe(true);
      expect(enabledProperty?.visibleIf?.(question)).toBe(true);
    });

    it('hides native copy choices from when advanced carry forward is enabled', () => {
      const choicesFromQuestionProperty = Serializer.findProperty(
        'checkbox',
        'choicesFromQuestion',
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

    it('hides inline choices editor when advanced carry forward is enabled', () => {
      const choicesProperty = Serializer.findProperty('checkbox', 'choices');

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

    it('re-evaluates data list visibility when carry-forward flag toggles via dependsOn', () => {
      const dataListProperty = Serializer.findProperty(
        'dropdown',
        DATA_LIST_PROPERTY_NAME,
      );

      expect(dataListProperty?.dependsOn).toEqual([
        'choicesFromQuestion',
        'advancedCarryForwardEnabled',
      ]);
    });
  });

  describe('dynamic picker callbacks', () => {
    it('returns select-base source questions excluding self', async () => {
      const survey = new SurveyModel({
        elements: [
          {
            type: 'checkbox',
            name: 'brands',
            choices: ['A', 'B'],
          },
          {
            type: 'radiogroup',
            name: 'colors',
            choices: ['Red', 'Blue'],
          },
          {
            type: 'checkbox',
            name: 'target',
            choices: ['X'],
          },
        ],
      });

      const target = survey.getQuestionByName('target');
      const choices = await getPropertyChoices('checkbox', ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY, {
        survey,
        name: target.name,
      });

      expect(choices.map((choice) => choice.value)).toEqual(['brands', 'colors']);
    });

    it('returns union of source choices for priority picker', async () => {
      const survey = new SurveyModel({
        elements: [
          {
            type: 'checkbox',
            name: 'brands',
            choices: ['A', 'B'],
          },
          {
            type: 'radiogroup',
            name: 'colors',
            choices: ['Red', 'Blue'],
          },
          {
            type: 'checkbox',
            name: 'target',
            choices: ['X'],
            advancedCarryForwardSources: ['brands', 'colors'],
          },
        ],
      });

      const target = survey.getQuestionByName('target');
      const choices = await getPropertyChoices(
        'checkbox',
        ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
        {
          survey,
          advancedCarryForwardSources: target.advancedCarryForwardSources,
        },
      );

      expect(choices).toEqual(
        expect.arrayContaining([
          { value: 'A', text: 'brands: (A)' },
          { value: 'B', text: 'brands: (B)' },
          { value: 'Red', text: 'colors: (Red)' },
          { value: 'Blue', text: 'colors: (Blue)' },
        ]),
      );
      expect(choices).toHaveLength(4);
    });
  });

  it('is idempotent', () => {
    expect(() => registerAdvancedCarryForwardGlobals()).not.toThrow();
  });

  it('resetAdvancedCarryForwardRegistryForTests clears serializer metadata', () => {
    resetAdvancedCarryForwardRegistryForTests();

    expect(
      Serializer.findProperty('checkbox', ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY),
    ).toBeUndefined();

    registerAdvancedCarryForwardGlobals();
  });

  it('does not stack native visibleIf wrappers across reset/register cycles', () => {
    const property = Serializer.findProperty('checkbox', 'choicesFromQuestion');
    const countWrapMarkers = (value: string) =>
      (value.match(/advancedCarryForwardEnabled/g) ?? []).length;

    const afterFirstRegister = property?.visibleIf?.toString() ?? '';
    resetAdvancedCarryForwardRegistryForTests();
    registerAdvancedCarryForwardGlobals();
    const afterResetAndRegister = property?.visibleIf?.toString() ?? '';

    expect(countWrapMarkers(afterResetAndRegister)).toBe(
      countWrapMarkers(afterFirstRegister),
    );
  });
});
