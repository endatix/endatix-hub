import { Helpers, ItemValue, SurveyModel } from "survey-core";
import { ChoiceValue, DynamicLoopModel, PanelItem } from "../types";
import {
  getUniqueSelectedChoices,
  isLoopQuestion,
  shuffleArray,
} from "../loop-utils";
import { resolveLoopSourceQuestions } from "../utils/resolve-loop-source";

export type CategorizedChoices = {
  priority: PanelItem[];
  answered: PanelItem[];
  newOthers: PanelItem[];
};

/**
 * Syncs the loop source choices to the panel question
 * @param _survey - Unused. Sources resolve from the loop's own scope, which may
 *   be a panel rather than the survey root; the parameter stays for call-site
 *   and test compatibility.
 * @param panelQuestion - The panel question to sync the loop source choices to
 */
export function syncSingleLoopSource(
  _survey: SurveyModel,
  panelQuestion: DynamicLoopModel,
) {
  if (!isLoopQuestion(panelQuestion)) return;

  const existingValue: PanelItem[] = Array.isArray(panelQuestion.value)
    ? panelQuestion.value
    : [];
  const existingFilledInItemValues =
    getExistingFilledInItemValues(panelQuestion);

  // Scope-aware: a loop inside a panel reads its sibling in *that* panel
  // instance, which a survey-root lookup by name can neither find nor
  // disambiguate between instances.
  const loopSourceQuestions = resolveLoopSourceQuestions(panelQuestion);

  const choicesMap = getUniqueSelectedChoices(loopSourceQuestions);

  const categorized = categorizeChoices(
    choicesMap,
    panelQuestion.priorityItems,
    existingFilledInItemValues,
  );

  const maxLimit = Number.parseInt(panelQuestion.maxLoopCount) || 0;
  let processedCategories = applyLimits(categorized, maxLimit);

  processedCategories = randomizeCategories(
    processedCategories,
    panelQuestion.randomizeLoop,
  );

  const existingAllMap = new Map(
    existingValue.map((value) => [value.itemValue, value]),
  );

  const panelsToDisplay = flattenAndMerge(processedCategories, existingAllMap);

  const panelsHaveChanged = !Helpers.isArraysEqual(
    existingValue,
    panelsToDisplay,
    false,
  );
  if (panelsHaveChanged) {
    panelQuestion.value = panelsToDisplay;
  }
}

/**
 * Gets the existing filled in item values
 * @param panelQuestion - The panel question to get the existing filled in item values from
 * @returns The existing filled in item values
 */
function getExistingFilledInItemValues(
  panelQuestion: DynamicLoopModel,
): Set<ChoiceValue> {
  const existingFilledInItemValues = new Set<ChoiceValue>();
  const existingValue: PanelItem[] = Array.isArray(panelQuestion.value)
    ? panelQuestion.value
    : [];

  if (panelQuestion.panels) {
    panelQuestion.panels.forEach((panel, index) => {
      const hasAnswer = panel.questions.some(
        (question) => !question.isEmpty() && question.isVisible,
      );

      if (hasAnswer && existingValue[index]) {
        existingFilledInItemValues.add(existingValue[index].itemValue);
      }
    });
  }

  return existingFilledInItemValues;
}

/**
 * Categorizes the choices into priority, answered, and new others
 * @param choices - The choices to categorize
 * @param priorityValues - The priority values
 * @param answeredValues - The answered values
 * @returns The categorized choices
 */
export function categorizeChoices(
  choices: ItemValue[],
  priorityValues: ChoiceValue[],
  answeredValues: Set<ChoiceValue>,
): CategorizedChoices {
  const prioritySet = new Set(priorityValues || []);
  const result: CategorizedChoices = {
    priority: [],
    answered: [],
    newOthers: [],
  };

  choices.forEach((choice) => {
    const item = {
      itemText: choice.text || choice.value,
      itemValue: choice.value,
    };

    if (prioritySet.has(choice.value)) {
      result.priority.push(item);
    } else if (answeredValues.has(choice.value)) {
      result.answered.push(item);
    } else {
      result.newOthers.push(item);
    }
  });

  return result;
}

/**
 * Applies the limits to the categorized choices
 * @param categories - The categorized choices
 * @param maxLimit - The maximum limit
 * @returns The categorized choices with the limits applied
 */
export function applyLimits(
  categories: CategorizedChoices,
  maxLimit: number,
): CategorizedChoices {
  if (maxLimit < 1) return categories;

  const remainingSlots = Math.max(0, maxLimit - categories.priority.length);
  const allowedAnswered = categories.answered.slice(0, remainingSlots);

  const slotsForNew = remainingSlots - allowedAnswered.length;
  const allowedNew =
    slotsForNew > 0 ? categories.newOthers.slice(0, slotsForNew) : [];

  return {
    priority: categories.priority,
    answered: allowedAnswered,
    newOthers: allowedNew,
  };
}

/**
 * Randomizes the new others choices
 * @param categories - The categorized choices
 * @param shouldRandomize - Indicates if the new others choices should be randomized
 * @returns The categorized choices with the new others choices randomized
 */
export function randomizeCategories(
  categories: CategorizedChoices,
  shouldRandomize: boolean,
): CategorizedChoices {
  if (!shouldRandomize) return categories;

  const mixForShuffle = [...categories.priority, ...categories.newOthers];

  return {
    ...categories,
    priority: [],
    newOthers: shuffleArray(mixForShuffle),
  };
}

/**
 * Flattens and merges the categorized choices into a single array of panel items
 * @param categories - The categorized choices
 * @param existingValueMap - The existing value map
 * @returns The flattened and merged panel items
 */
export function flattenAndMerge(
  categories: CategorizedChoices,
  existingValueMap: Map<ChoiceValue, PanelItem>,
): PanelItem[] {
  const combined = [
    ...categories.priority,
    ...categories.answered,
    ...categories.newOthers,
  ];

  return combined.map((obj, index) => {
    const existingObj = existingValueMap.get(obj.itemValue);
    return {
      ...(existingObj || obj),
      loopIndex: existingObj?.loopIndex ?? index,
    };
  });
}
