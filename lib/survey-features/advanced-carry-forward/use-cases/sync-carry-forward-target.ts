import { Helpers, ItemValue, SurveyModel } from 'survey-core';
import {
  extractUniqueChoicesBy,
  getLoopChoicesFromQuestion,
  isSelectBaseQuestion,
} from '@/lib/survey-features/question-loops/loop-utils';
import { SourceSelectionModes } from '@/lib/survey-features/question-loops/types';
import type { AdvancedCarryForwardQuestion } from '../types';
import { isAdvancedCarryForwardEnabled } from './carry-forward-question-utils';
import {
  limitCarryForwardChoices,
  parseCarryForwardMaxChoices,
} from './limit-carry-forward-choices';

const PRIORITY_GROUP = 'priority';

export function splitByPriority(
  choices: ItemValue[],
  priorityValues: string[] | undefined,
): { priority: ItemValue[]; rest: ItemValue[] } {
  if (!priorityValues?.length) {
    return { priority: [], rest: choices };
  }

  const choiceByValue = new Map(
    choices.map((choice) => [String(choice.value), choice]),
  );
  const prioritySet = new Set(priorityValues.map(String));
  const priority = priorityValues
    .map((value) => choiceByValue.get(String(value)))
    .filter((choice): choice is ItemValue => choice !== undefined);
  const rest = choices.filter(
    (choice) => !prioritySet.has(String(choice.value)),
  );

  return { priority, rest };
}

function cloneChoice(
  target: AdvancedCarryForwardQuestion,
  choice: ItemValue,
): ItemValue {
  return target.createItemValue(choice.value, choice.text ?? choice.value);
}

function markPriorityChoices(
  target: AdvancedCarryForwardQuestion,
  priorityChoices: ItemValue[],
  shouldRandomize: boolean,
): ItemValue[] {
  return priorityChoices.map((choice) => {
    const item = cloneChoice(target, choice);

    if (shouldRandomize) {
      item.randomize = false;
      item.group = PRIORITY_GROUP;
    }

    return item;
  });
}

function pruneInvalidSelections(target: AdvancedCarryForwardQuestion): void {
  const validValues = new Set(target.choices.map((choice) => choice.value));
  const currentValue = target.value;

  if (currentValue == null) {
    return;
  }

  if (Array.isArray(currentValue)) {
    const prunedValue = currentValue.filter((value) => validValues.has(value));

    if (prunedValue.length !== currentValue.length) {
      target.value = prunedValue;
    }

    return;
  }

  if (!validValues.has(currentValue)) {
    target.clearValue();
  }
}

export function syncSingleCarryForwardTarget(
  survey: SurveyModel,
  target: AdvancedCarryForwardQuestion,
): void {
  if (!isAdvancedCarryForwardEnabled(target)) {
    return;
  }

  const sourceQuestions = (target.advancedCarryForwardSources ?? [])
    .map((sourceName) => survey.getQuestionByName(sourceName))
    .filter(isSelectBaseQuestion);
  const selectionMode =
    target.advancedCarryForwardMode ?? SourceSelectionModes.All;
  const aggregatedChoices = extractUniqueChoicesBy(sourceQuestions, (source) =>
    getLoopChoicesFromQuestion(source, selectionMode),
  );
  const { priority, rest } = splitByPriority(
    aggregatedChoices,
    target.advancedCarryForwardPriorityItems,
  );
  const maxChoiceLimit = parseCarryForwardMaxChoices(
    target.advancedCarryForwardMaxChoices,
  );
  const limitedChoices = limitCarryForwardChoices(priority, rest, maxChoiceLimit);
  const shouldRandomize = target.choicesOrder === 'random';
  const newChoices = [
    ...markPriorityChoices(target, limitedChoices.priority, shouldRandomize),
    ...limitedChoices.rest.map((choice) => cloneChoice(target, choice)),
  ];

  const choicesHaveChanged = !Helpers.isArraysEqual(
    target.choices,
    newChoices,
    false,
  );

  if (choicesHaveChanged) {
    target.choices = newChoices;
    pruneInvalidSelections(target);
  }
}
