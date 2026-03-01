import { ItemValue, SurveyModel } from "survey-core";
import { ChoiceValue, DynamicLoopModel, PanelItem } from "../types";
import {
  getUniqueSelectedChoices,
  isLoopQuestion,
  isSelectBaseQuestion,
  shuffleArray,
} from "../loop-utils";

type GroupedChoices = {
  priorityChoicesGroup: Map<ChoiceValue, PanelItem>;
  othersChoicesGroup: Map<ChoiceValue, PanelItem>;
};

/**
 * Syncs the loop source choices to the panel question
 * @param survey - The survey model
 * @param panelQuestion - The panel question to sync the loop source choices to
 */
export function syncSingleLoopSource(
  survey: SurveyModel,
  panelQuestion: DynamicLoopModel,
) {
  if (!isLoopQuestion(panelQuestion)) return;

  const loopSourceQuestions = panelQuestion.loopSource
    .map((sourceName) => survey.getQuestionByName(sourceName))
    .filter(isSelectBaseQuestion);

  const choicesMap = getUniqueSelectedChoices(loopSourceQuestions);
  const groupedChoices = groupChoicesByPriority(
    choicesMap,
    panelQuestion.priorityItems,
  );

  const maxLimit = Number.parseInt(panelQuestion.maxLoopCount) || 0;
  const panelsToDisplay = {
    current: applyMaxLimit(groupedChoices, maxLimit),
  };

  if (panelQuestion.randomizeLoop) {
    panelsToDisplay.current = shuffleArray(panelsToDisplay.current);
  }

  panelsToDisplay.current = panelsToDisplay.current.map((obj, index) => ({
    ...obj,
    loopIndex: index,
  }));

  const existingValue = Array.isArray(panelQuestion.value)
    ? panelQuestion.value
    : [];

  // Only trigger a SurveyJS update if the array actually changed
  if (
    JSON.stringify(existingValue) !== JSON.stringify(panelsToDisplay.current)
  ) {
    panelQuestion.value = panelsToDisplay.current;
  }
}

/**
 * Buckets the loop source choices into priority and others based on the priority values
 * @param choices - The choices to bucket
 * @param priorityValues - The priority values to use for bucketing
 * @returns An object with the priority choices group and the others choices group
 */
export function groupChoicesByPriority(
  choices: ItemValue[],
  priorityValues: ChoiceValue[],
): GroupedChoices {
  const prioritySet = new Set(priorityValues);
  const priorityChoicesGroup = new Map<ChoiceValue, PanelItem>();
  const othersChoicesGroup = new Map<ChoiceValue, PanelItem>();

  choices.forEach((choice) => {
    const panelItem = {
      itemText: choice.text || choice.value,
      itemValue: choice.value,
    };

    if (prioritySet.has(choice.value)) {
      priorityChoicesGroup.set(choice.value, panelItem);
    } else {
      othersChoicesGroup.set(choice.value, panelItem);
    }
  });

  return {
    priorityChoicesGroup,
    othersChoicesGroup,
  };
}

/**
 * Applies the max limit to the grouped choices
 * @param groupedChoices - The grouped choices to apply the max limit to
 * @param maxLimit - The max limit to apply
 * @returns The grouped choices with the max limit applied
 */
export function applyMaxLimit(
  groupedChoices: GroupedChoices,
  maxLimit: number,
): PanelItem[] {
  const { priorityChoicesGroup, othersChoicesGroup } = groupedChoices;
  // No limit, return all choices
  if (maxLimit < 1) {
    return [...priorityChoicesGroup.values(), ...othersChoicesGroup.values()];
  }

  const remainingSlots = Math.max(0, maxLimit - priorityChoicesGroup.size);
  if (othersChoicesGroup.size > remainingSlots) {
    // If we have more others than we need, shuffle them before slicing
    const shuffledOthers = shuffleArray([...othersChoicesGroup.values()]);
    return [
      ...priorityChoicesGroup.values(),
      ...shuffledOthers.slice(0, remainingSlots),
    ];
  }

  return [...priorityChoicesGroup.values(), ...othersChoicesGroup.values()];
}
