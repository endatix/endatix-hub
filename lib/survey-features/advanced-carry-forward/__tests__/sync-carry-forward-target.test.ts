import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Helpers, ItemValue, SurveyModel } from 'survey-core';
import addRandomizeGroupFeature from '@/lib/questions/features/group-randomization';
import { SourceSelectionModes } from '@/lib/survey-features/question-loops/types';
import { registerAdvancedCarryForwardGlobals } from '../infrastructure/registry';
import {
  splitByPriority,
  syncSingleCarryForwardTarget,
} from '../use-cases/sync-carry-forward-target';
import type { AdvancedCarryForwardQuestion } from '../types';

function choice(value: string, text?: string): ItemValue {
  return new ItemValue(value, text ?? value);
}

beforeAll(() => {
  registerAdvancedCarryForwardGlobals();
  addRandomizeGroupFeature();
});

describe('splitByPriority', () => {
  it('returns all choices in rest when priority values are empty', () => {
    // Arrange
    const choices = [choice('a'), choice('b')];

    // Act
    const result = splitByPriority(choices, []);

    // Assert
    expect(result.priority).toEqual([]);
    expect(result.rest).toEqual(choices);
  });

  it('orders priority choices by configured priority values', () => {
    // Arrange
    const choices = [choice('a'), choice('b'), choice('c')];

    // Act
    const result = splitByPriority(choices, ['c', 'a']);

    // Assert
    expect(result.priority.map((item) => item.value)).toEqual(['c', 'a']);
    expect(result.rest.map((item) => item.value)).toEqual(['b']);
  });
});

describe('syncSingleCarryForwardTarget', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('aggregates and deduplicates choices from multiple sources in All mode', () => {
    // Arrange
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
          choices: ['B', 'Red'],
        },
        {
          type: 'checkbox',
          name: 'target',
          choices: ['legacy'],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ['brands', 'colors'],
          advancedCarryForwardMode: SourceSelectionModes.All,
        },
      ],
    });
    const target = survey.getQuestionByName('target') as AdvancedCarryForwardQuestion;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert
    expect(target.choices.map((item) => item.value)).toEqual(['A', 'B', 'Red']);
  });

  it('uses Selected Only mode per source question', () => {
    // Arrange
    const survey = new SurveyModel({
      elements: [
        {
          type: 'checkbox',
          name: 'brands',
          choices: ['A', 'B', 'C'],
        },
        {
          type: 'checkbox',
          name: 'target',
          choices: ['legacy'],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ['brands'],
          advancedCarryForwardMode: SourceSelectionModes.SelectedOnly,
        },
      ],
    });
    survey.setValue('brands', ['A', 'C']);
    const target = survey.getQuestionByName('target') as AdvancedCarryForwardQuestion;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert
    expect(target.choices.map((item) => item.value)).toEqual(['A', 'C']);
  });

  it('uses Unselected Only mode per source question', () => {
    // Arrange
    const survey = new SurveyModel({
      elements: [
        {
          type: 'checkbox',
          name: 'brands',
          choices: ['A', 'B', 'C'],
        },
        {
          type: 'checkbox',
          name: 'target',
          choices: ['legacy'],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ['brands'],
          advancedCarryForwardMode: SourceSelectionModes.UnselectedOnly,
        },
      ],
    });
    survey.setValue('brands', ['A']);
    const target = survey.getQuestionByName('target') as AdvancedCarryForwardQuestion;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert
    expect(target.choices.map((item) => item.value)).toEqual(['B', 'C']);
  });

  it('places priority choices first and marks them for group randomization', () => {
    // Arrange
    const survey = new SurveyModel({
      elements: [
        {
          type: 'checkbox',
          name: 'brands',
          choices: ['A', 'B', 'C'],
        },
        {
          type: 'checkbox',
          name: 'target',
          choices: ['legacy'],
          choicesOrder: 'random',
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ['brands'],
          advancedCarryForwardPriorityItems: ['C', 'A'],
        },
      ],
    });
    const target = survey.getQuestionByName('target') as AdvancedCarryForwardQuestion;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert
    expect(target.choices.map((item) => item.value)).toEqual(['C', 'A', 'B']);
    expect(target.choices[0].group).toBe('priority');
    expect(target.choices[0].randomize).toBe(false);
    expect(target.choices[1].group).toBe('priority');
    expect(target.choices[2].group).toBeUndefined();
  });

  it('limits carried-forward choices when max choices is set', () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: 'checkbox',
          name: 'brands',
          choices: ['A', 'B', 'C', 'D'],
        },
        {
          type: 'checkbox',
          name: 'target',
          choices: ['legacy'],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ['brands'],
          advancedCarryForwardPriorityItems: ['D'],
          advancedCarryForwardMaxChoices: 2,
        },
      ],
    });
    const target = survey.getQuestionByName('target') as AdvancedCarryForwardQuestion;

    syncSingleCarryForwardTarget(survey, target);

    expect(target.choices.map((item) => item.value)).toEqual(['D', 'A']);
  });

  it('keeps priority choices at the front after render-time randomization', () => {
    // Arrange
    const survey = new SurveyModel({
      elements: [
        {
          type: 'checkbox',
          name: 'brands',
          choices: ['A', 'B', 'C', 'D'],
        },
        {
          type: 'checkbox',
          name: 'target',
          choices: ['legacy'],
          choicesOrder: 'random',
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ['brands'],
          advancedCarryForwardPriorityItems: ['A'],
        },
      ],
    });
    const target = survey.getQuestionByName('target') as AdvancedCarryForwardQuestion;
    syncSingleCarryForwardTarget(survey, target);

    // Act & Assert
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const randomized = Helpers.randomizeArray([...target.choices]);
      expect(randomized[0].value).toBe('A');
    }
  });

  it('skips choice writes when aggregated choices are unchanged', () => {
    // Arrange
    const survey = new SurveyModel({
      elements: [
        {
          type: 'checkbox',
          name: 'brands',
          choices: ['A', 'B'],
        },
        {
          type: 'checkbox',
          name: 'target',
          choices: ['A', 'B'],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ['brands'],
        },
      ],
    });
    const target = survey.getQuestionByName('target') as AdvancedCarryForwardQuestion;
    const isArraysEqualSpy = vi.spyOn(Helpers, 'isArraysEqual');
    syncSingleCarryForwardTarget(survey, target);
    const callCountAfterFirstSync = isArraysEqualSpy.mock.calls.length;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert
    expect(isArraysEqualSpy.mock.calls.length).toBe(callCountAfterFirstSync + 1);
    isArraysEqualSpy.mockRestore();
  });

  it('prunes invalid selected values when choices shrink', () => {
    // Arrange
    const survey = new SurveyModel({
      elements: [
        {
          type: 'checkbox',
          name: 'brands',
          choices: ['A', 'B', 'C'],
        },
        {
          type: 'checkbox',
          name: 'target',
          choices: ['legacy'],
          value: ['legacy', 'A'],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ['brands'],
          advancedCarryForwardMode: SourceSelectionModes.SelectedOnly,
        },
      ],
    });
    survey.setValue('brands', ['A']);
    survey.setValue('target', ['legacy', 'A']);
    const target = survey.getQuestionByName('target') as AdvancedCarryForwardQuestion;

    // Act
    syncSingleCarryForwardTarget(survey, target);

    // Assert
    expect(target.choices.map((item) => item.value)).toEqual(['A']);
    expect(Array.from(target.value as string[])).toEqual(['A']);
  });

  it('works on tagbox with blind search enabled without errors', () => {
    // Arrange
    const survey = new SurveyModel({
      elements: [
        {
          type: 'checkbox',
          name: 'brands',
          choices: ['A', 'B'],
          value: ['A', 'B'],
        },
        {
          type: 'tagbox',
          name: 'target',
          choices: ['legacy'],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ['brands'],
          edxHideUntilTyping: true,
          edxMinSearchLength: 2,
        },
      ],
    });
    const target = survey.getQuestionByName('target') as AdvancedCarryForwardQuestion;

    // Act & Assert
    expect(() => syncSingleCarryForwardTarget(survey, target)).not.toThrow();
    expect(target.choices.map((item) => item.value)).toEqual(['A', 'B']);
  });
});
