import { Helpers, ItemValue, SurveyModel } from "survey-core";
import { copyChoiceItemWithMedia } from "@/lib/utils/survey";
import type { AdvancedCarryForwardQuestion } from "../types";
import { isAdvancedCarryForwardEnabled } from "../utils";
import { computeCarryForwardAggregatedItems } from "./compute-carry-forward-items";

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

  const { priority, rest } = computeCarryForwardAggregatedItems(survey, target);
  const shouldRandomize = target.choicesOrder === "random";
  const newChoices = [
    ...markPriorityChoices(target, priority, shouldRandomize),
    ...rest.map((choice) => copyChoiceItemWithMedia(target, choice)),
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
