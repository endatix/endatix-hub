import type { ItemValue } from "survey-core";
import { normalizeChoiceKey } from "@/lib/utils/survey";

/**
 * Splits choices into priority and rest based on priority values.
 * @param choices - The choices to split.
 * @param priorityValues - The priority values to split by.
 * @returns An object with priority and rest choices.
 */
export function splitByPriority(
  choices: ItemValue[],
  priorityValues: string[] | undefined,
): { priority: ItemValue[]; rest: ItemValue[] } {
  if (!priorityValues?.length) {
    return { priority: [], rest: choices };
  }

  const uniquePriorityValues = [
    ...new Set(priorityValues.map((value) => normalizeChoiceKey(value))),
  ];
  const choiceByValue = new Map(
    choices.map((choice) => [normalizeChoiceKey(choice.value), choice]),
  );
  const prioritySet = new Set(uniquePriorityValues);
  const priority = uniquePriorityValues
    .map((value) => choiceByValue.get(value))
    .filter((choice): choice is ItemValue => choice !== undefined);

  const rest = choices.filter(
    (choice) => !prioritySet.has(normalizeChoiceKey(choice.value)),
  );

  return { priority, rest };
}
