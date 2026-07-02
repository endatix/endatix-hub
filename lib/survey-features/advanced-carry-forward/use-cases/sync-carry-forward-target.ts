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

function buildSourceChoiceIndex(
  sourceQuestions: ReturnType<typeof getCarryForwardSourceQuestions>,
): Map<unknown, ItemValue> {
  const index = new Map<unknown, ItemValue>();

  for (const source of sourceQuestions) {
    for (const choice of source.choices ?? []) {
      if (!index.has(choice.value)) {
        index.set(choice.value, choice);
      }
    }
  }

  return index;
}

/**
 * Recovers the original source ItemValue (with image fields) for each
 * aggregated choice. Keyed by raw (non-coerced) value to match
 * extractUniqueChoicesBy's own dedup key exactly — this guarantees we
 * enrich from the same source choice that "won" the dedup, even when two
 * sources have values that are string-equal but type-different (e.g. 1 vs '1').
 */
function enrichAggregatedChoicesFromSources(
  aggregatedChoices: ItemValue[],
  sourceQuestions: ReturnType<typeof getCarryForwardSourceQuestions>,
): ItemValue[] {
  const sourceChoiceIndex = buildSourceChoiceIndex(sourceQuestions);

  return aggregatedChoices.map(
    (choice) => sourceChoiceIndex.get(choice.value) ?? choice,
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

function buildValidChoiceValues(
  target: AdvancedCarryForwardQuestion,
): Set<string> {
  const validValues = new Set(
    target.choices.map((choice) => String(choice.value)),
  );

  if (target.hasNone && target.noneItem) {
    validValues.add(String(target.noneItem.value));
  }

  if (target.hasOther && target.otherItem) {
    validValues.add(String(target.otherItem.value));
  }

  return validValues;
}

function pruneInvalidSelections(target: AdvancedCarryForwardQuestion): void {
  const validValues = buildValidChoiceValues(target);
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
