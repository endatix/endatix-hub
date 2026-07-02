import { beforeEach, describe, expect, it } from 'vitest';
import { Model } from 'survey-core';
import { registerAdvancedCarryForwardGlobals } from '../infrastructure/registry';
import {
  bindAdvancedCarryForwardToSurvey,
  clearAdvancedCarryForwardBindingsForTests,
} from '../infrastructure/survey-bindings';
import {
  loadCarryForwardTargets,
  resetCarryForwardUpdateGuardForTests,
} from '../use-cases/load-carry-forward-targets';
import type { AdvancedCarryForwardQuestion } from '../types';

function countValueChangedListeners(model: Model): number {
  return (
    (model.onValueChanged as { callbacks?: unknown[] }).callbacks?.length ?? 0
  );
}

function countLoadCarryForwardValueChangedListeners(model: Model): number {
  const callbacks =
    (model.onValueChanged as { callbacks?: unknown[] }).callbacks ?? [];

  return callbacks.filter((callback) => callback === loadCarryForwardTargets)
    .length;
}

const carryForwardSurveyJson = {
  elements: [
    {
      type: 'checkbox',
      name: 'brands',
      choices: ['A', 'B', 'C'],
      defaultValue: ['A', 'B'],
    },
    {
      type: 'checkbox',
      name: 'target',
      choices: ['legacy'],
      advancedCarryForwardEnabled: true,
      advancedCarryForwardSources: ['brands'],
      advancedCarryForwardMode: 'selected',
    },
  ],
};

describe('bindAdvancedCarryForwardToSurvey', () => {
  beforeEach(() => {
    registerAdvancedCarryForwardGlobals();
    clearAdvancedCarryForwardBindingsForTests();
    resetCarryForwardUpdateGuardForTests();
  });

  it('syncs carry-forward targets on initial bind', () => {
    // Arrange
    const model = new Model(carryForwardSurveyJson);
    model.setValue('brands', ['A', 'B']);
    const target = model.getQuestionByName('target') as AdvancedCarryForwardQuestion;

    // Act
    bindAdvancedCarryForwardToSurvey(model);

    // Assert
    expect(target.choices.map((choice) => choice.value)).toEqual(['A', 'B']);
  });

  it('re-syncs target when a source question value changes', () => {
    // Arrange
    const model = new Model(carryForwardSurveyJson);
    model.setValue('brands', ['A', 'B']);
    bindAdvancedCarryForwardToSurvey(model);
    const target = model.getQuestionByName('target') as AdvancedCarryForwardQuestion;
    const brands = model.getQuestionByName('brands');

    // Act
    brands!.value = ['C'];
    model.setValue('brands', ['C']);

    // Assert
    expect(target.choices.map((choice) => choice.value)).toEqual(['C']);
  });

  it('does not update unrelated targets when a non-source question changes', () => {
    // Arrange
    const model = new Model({
      elements: [
        { type: 'text', name: 'otherQ' },
        ...carryForwardSurveyJson.elements,
      ],
    });
    model.setValue('brands', ['A', 'B']);
    bindAdvancedCarryForwardToSurvey(model);
    const target = model.getQuestionByName('target') as AdvancedCarryForwardQuestion;
    const choicesAfterBind = target.choices.map((choice) => choice.value);

    // Act
    model.setValue('otherQ', 'hello');

    // Assert
    expect(target.choices.map((choice) => choice.value)).toEqual(choicesAfterBind);
  });

  it('binds only once per model instance', () => {
    const model = new Model(carryForwardSurveyJson);
    const listenersBeforeBind = countValueChangedListeners(model);

    expect(countLoadCarryForwardValueChangedListeners(model)).toBe(0);

    const firstDispose = bindAdvancedCarryForwardToSurvey(model);
    expect(countValueChangedListeners(model)).toBe(listenersBeforeBind + 1);
    expect(countLoadCarryForwardValueChangedListeners(model)).toBe(1);

    const secondDispose = bindAdvancedCarryForwardToSurvey(model);
    expect(countValueChangedListeners(model)).toBe(listenersBeforeBind + 1);
    expect(countLoadCarryForwardValueChangedListeners(model)).toBe(1);
    expect(secondDispose).toBeTypeOf('function');

    firstDispose();
    expect(countValueChangedListeners(model)).toBe(listenersBeforeBind);
    expect(countLoadCarryForwardValueChangedListeners(model)).toBe(0);
  });
});
