import { ItemValue, SurveyModel } from "survey-core";
import { copyChoiceItemWithMedia } from "@/lib/utils/survey";
import type { AdvancedCarryForwardQuestion } from "../types";
import { isAdvancedCarryForwardEnabled } from "../utils";
import {
  haveCarryForwardChoicesChanged,
  indexChoicesByValue,
  preferResolvedChoiceLabel,
} from "../utils/carry-forward-choice-display";
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

function buildCarryForwardChoices(
  survey: SurveyModel,
  target: AdvancedCarryForwardQuestion,
): ItemValue[] {
  const { priority, rest } = computeCarryForwardAggregatedItems(survey, target);
  const shouldRandomize = target.choicesOrder === "random";
  const existingByValue = indexChoicesByValue(target.choices);

  const newChoices: ItemValue[] = [
    ...markPriorityChoices(target, priority, shouldRandomize),
    ...rest.map((choice) => copyChoiceItemWithMedia(target, choice)),
  ];

  for (let i = 0; i < newChoices.length; i++) {
    newChoices[i] = preferResolvedChoiceLabel(newChoices[i]!, existingByValue);
  }

  return newChoices;
}

/**
 * Syncs one advanced carry-forward target from its configured sources.
 *
 * Aggregation (sources → mode → dedupe → priority → max) lives in
 * {@link computeCarryForwardAggregatedItems}. This layer copies items onto the
 * select-base target and preserves already-resolved display labels across
 * lazy-load page resets (#829).
 *
 * @returns whether the target's choices changed.
 */
export function syncSingleCarryForwardTarget(
  survey: SurveyModel,
  target: AdvancedCarryForwardQuestion,
): boolean {
  if (!isAdvancedCarryForwardEnabled(target)) {
    return false;
  }

  const newChoices = buildCarryForwardChoices(survey, target);
  if (!haveCarryForwardChoicesChanged(target.choices, newChoices)) {
    return false;
  }

  target.choices = newChoices;
  target.clearIncorrectValues();
  return true;
}
