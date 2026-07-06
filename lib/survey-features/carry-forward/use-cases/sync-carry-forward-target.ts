import { Helpers, ItemValue, SurveyModel } from "survey-core";
import {
  copyChoiceItemWithMedia,
  extractUniqueChoicesBy,
  getChoicesFromSourceQuestion,
} from "@/lib/utils/survey";
import {
  limitCarryForwardChoices,
  parseCarryForwardMaxChoices,
} from "../utils/limit-carry-forward-choices";
import { resolveCarryForwardSelectionMode } from "../utils/map-carry-forward-mode";
import { splitByPriority } from "../utils/split-by-priority";
import { SourceSelectionModes } from "@/lib/survey-features/question-loops/types";
import type { AdvancedCarryForwardQuestion } from "../types";
import {
  getCarryForwardSourceQuestions,
  isAdvancedCarryForwardEnabled,
} from "../utils";

const PRIORITY_GROUP = "priority";

function markPriorityChoices(
  target: AdvancedCarryForwardQuestion,
  priorityChoices: ItemValue[],
  shouldRandomize: boolean,
): ItemValue[] {
  return priorityChoices.map((choice) => {
    const item = copyChoiceItemWithMedia(target, choice);

    if (shouldRandomize) {
      item.randomize = false;
      item.group = PRIORITY_GROUP;
    }

    return item;
  });
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
    target.edxCarryForwardMode,
  );
  const aggregatedChoices = extractUniqueChoicesBy(sourceQuestions, (source) =>
    getChoicesFromSourceQuestion(source, selectionMode),
  );
  const { priority, rest } = splitByPriority(
    aggregatedChoices,
    target.edxCarryForwardPriorityItems,
  );
  const maxChoiceLimit = parseCarryForwardMaxChoices(
    target.edxCarryForwardMaxChoices,
  );
  const limitedChoices = limitCarryForwardChoices(
    priority,
    rest,
    maxChoiceLimit,
  );
  const shouldRandomize = target.choicesOrder === "random";
  const newChoices = [
    ...markPriorityChoices(target, limitedChoices.priority, shouldRandomize),
    ...limitedChoices.rest.map((choice) =>
      copyChoiceItemWithMedia(target, choice),
    ),
  ];

  const choicesHaveChanged = !Helpers.isArraysEqual(
    target.choices,
    newChoices,
    false,
  );

  if (choicesHaveChanged) {
    target.choices = newChoices;
    target.clearIncorrectValues();
  }
}
