import { Helpers, ItemValue, SurveyModel } from 'survey-core';
import {
  extractUniqueChoicesBy,
  getLoopChoicesFromQuestion,
} from '@/lib/survey-features/question-loops/loop-utils';
import type { AdvancedCarryForwardQuestion } from '../types';
import {
  getCarryForwardSourceQuestions,
  isAdvancedCarryForwardEnabled,
} from './carry-forward-question-utils';
import { resolveCarryForwardSelectionMode } from './map-carry-forward-mode';
import {
  limitCarryForwardChoices,
  parseCarryForwardMaxChoices,
} from './limit-carry-forward-choices';

const PRIORITY_GROUP = 'priority';

function findSourceChoiceForValue(
  sourceQuestions: ReturnType<typeof getCarryForwardSourceQuestions>,
  value: unknown,
): ItemValue | undefined {
  for (const source of sourceQuestions) {
    const match = (source.choices ?? []).find(
      (choice) => String(choice.value) === String(value),
    );

    if (match) {
      return match;
    }
  }

  return undefined;
}

function enrichAggregatedChoicesFromSources(
  aggregatedChoices: ItemValue[],
  sourceQuestions: ReturnType<typeof getCarryForwardSourceQuestions>,
): ItemValue[] {
  return aggregatedChoices.map(
    (choice) =>
      findSourceChoiceForValue(sourceQuestions, choice.value) ?? choice,
  );
}

export function splitByPriority(
  choices: ItemValue[],
  priorityValues: string[] | undefined,
): { priority: ItemValue[]; rest: ItemValue[] } {
  if (!priorityValues?.length) {
    return { priority: [], rest: choices };
  }

  const uniquePriorityValues = [
    ...new Set(priorityValues.map((value) => String(value))),
  ];
  const choiceByValue = new Map(
    choices.map((choice) => [String(choice.value), choice]),
  );
  const prioritySet = new Set(uniquePriorityValues);
  const priority = uniquePriorityValues
    .map((value) => choiceByValue.get(value))
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
  const item = target.createItemValue(choice.value, choice.text ?? choice.value);
  const sourceImageLink =
    choice.imageLink ||
    (choice.getPropertyValue?.('imageLink') as string | undefined);

  if (sourceImageLink) {
    item.imageLink = sourceImageLink;
  }

  if (choice.imageHeight != null) {
    item.imageHeight = choice.imageHeight;
  }

  if (choice.imageWidth != null) {
    item.imageWidth = choice.imageWidth;
  }

  return item;
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

function isChoiceValueValid(
  validValues: Set<string>,
  value: unknown,
): boolean {
  return validValues.has(String(value));
}

function pruneInvalidSelections(target: AdvancedCarryForwardQuestion): void {
  const validValues = new Set(
    target.choices.map((choice) => String(choice.value)),
  );
  const currentValue = target.value;

  if (currentValue == null) {
    return;
  }

  if (Array.isArray(currentValue)) {
    const prunedValue = currentValue.filter((value) =>
      isChoiceValueValid(validValues, value),
    );

    if (prunedValue.length !== currentValue.length) {
      target.value = prunedValue;
    }

    return;
  }

  if (!isChoiceValueValid(validValues, currentValue)) {
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

  const sourceQuestions = getCarryForwardSourceQuestions(survey, target);
  const selectionMode = resolveCarryForwardSelectionMode(
    target.advancedCarryForwardMode,
  );
  const aggregatedChoices = enrichAggregatedChoicesFromSources(
    extractUniqueChoicesBy(sourceQuestions, (source) =>
      getLoopChoicesFromQuestion(source, selectionMode),
    ),
    sourceQuestions,
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
