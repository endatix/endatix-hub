import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Model, SurveyModel } from 'survey-core';
import { registerAdvancedCarryForwardGlobals } from '../infrastructure/registry';
import {
  bindAdvancedCarryForwardToSurvey,
  clearAdvancedCarryForwardBindingsForTests,
} from '../infrastructure/survey-bindings';
import {
  loadCarryForwardTargets,
  resetCarryForwardUpdateGuardForTests,
} from '../use-cases/load-carry-forward-targets';
import * as syncModule from '../use-cases/sync-carry-forward-target';
import type { AdvancedCarryForwardQuestion } from '../types';

describe('loadCarryForwardTargets', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    registerAdvancedCarryForwardGlobals();
    resetCarryForwardUpdateGuardForTests();
  });

  it('resets the re-entrancy guard when sync throws', () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: 'checkbox',
          name: 'dest',
          choices: [],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ['src'],
        },
        { type: 'checkbox', name: 'src', choices: ['A'] },
      ],
    });

    const syncSpy = vi
      .spyOn(syncModule, 'syncSingleCarryForwardTarget')
      .mockImplementationOnce(() => {
        throw new Error('sync failed');
      })
      .mockImplementation(() => {});

    expect(() =>
      loadCarryForwardTargets(survey, {
        name: 'src',
        value: ['A'],
      } as never),
    ).toThrow('sync failed');

    expect(syncSpy).toHaveBeenCalledTimes(1);

    expect(() =>
      loadCarryForwardTargets(survey, {
        name: 'src',
        value: ['B'],
      } as never),
    ).not.toThrow();

    // A guard stuck true would silently no-op instead of throwing, which
    // `.not.toThrow()` alone can't distinguish from a real, successful sync.
    expect(syncSpy).toHaveBeenCalledTimes(2);
  });
});

describe('bindAdvancedCarryForwardToSurvey property changes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    registerAdvancedCarryForwardGlobals();
    clearAdvancedCarryForwardBindingsForTests();
    resetCarryForwardUpdateGuardForTests();
  });

  it('re-syncs when a carry-forward control property changes', () => {
    const model = new Model({
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
          advancedCarryForwardMode: 'all',
        },
      ],
    });

    bindAdvancedCarryForwardToSurvey(model);
    model.setValue('brands', ['A', 'B']);

    const target = model.getQuestionByName('target') as AdvancedCarryForwardQuestion;
    expect(target.choices.map((choice) => choice.value)).toEqual(['A', 'B', 'C']);

    target.setPropertyValue('advancedCarryForwardMode', 'selected');
    model.setValue('brands', ['A', 'B']);

    expect(target.choices.map((choice) => choice.value)).toEqual(['A', 'B']);
  });

  it('syncs chained carry-forward targets in dependency order on initial bind', () => {
    const model = new Model({
      elements: [
        {
          type: 'checkbox',
          name: 'targetB',
          choices: [],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ['targetA'],
        },
        { type: 'checkbox', name: 'src', choices: ['X', 'Y'] },
        {
          type: 'checkbox',
          name: 'targetA',
          choices: [],
          advancedCarryForwardEnabled: true,
          advancedCarryForwardSources: ['src'],
        },
      ],
    });

    bindAdvancedCarryForwardToSurvey(model);

    const targetB = model.getQuestionByName('targetB');
    expect(targetB.choices.map((choice) => choice.value)).toEqual(['X', 'Y']);
  });
});
