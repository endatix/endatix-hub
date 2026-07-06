import type { ItemValue, QuestionSelectBase } from "survey-core";
import { normalizeChoiceKey } from "./choice-values";
import { copyChoiceItem } from "./copy-choice-item";

/**
 * Extracts and deduplicates choices from multiple questions.
 * Visits every question/choice once; first occurrence wins per normalized value key.
 */
export function extractUniqueChoicesBy(
  questions: QuestionSelectBase[],
  choiceSelector: (question: QuestionSelectBase) => ItemValue[],
  formatChoiceText?: (
    question: QuestionSelectBase,
    choice: ItemValue,
  ) => string,
): ItemValue[] {
  const uniqueChoices = new Map<string, ItemValue>();

  for (const question of questions) {
    for (const choice of choiceSelector(question) ?? []) {
      const key = normalizeChoiceKey(choice.value);
      if (!key || uniqueChoices.has(key)) {
        continue;
      }

      const item = copyChoiceItem(question, choice);
      if (formatChoiceText) {
        item.text = formatChoiceText(question, choice);
      }

      uniqueChoices.set(key, item);
    }
  }

  return [...uniqueChoices.values()];
}
