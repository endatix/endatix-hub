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

/**
 * Syncs one advanced carry-forward target from its configured sources.
 *
 * Aggregation (sources → mode → dedupe → priority → max) lives in
 * {@link computeCarryForwardAggregatedItems}. This layer copies items onto the
 * select-base target and preserves already-resolved display labels across
 * lazy-load page resets (#829).
 */
export function syncSingleCarryForwardTarget(
  survey: SurveyModel,
  target: AdvancedCarryForwardQuestion,
): void {
  if (!isAdvancedCarryForwardEnabled(target)) {
    return;
  }

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

  if (haveCarryForwardChoicesChanged(target.choices, newChoices)) {
    target.choices = newChoices;
    target.clearIncorrectValues();
  }
}
