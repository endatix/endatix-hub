import type { ItemValue, QuestionSelectBase } from "survey-core";
import {
  SourceSelectionModes,
  type SourceSelectionMode,
} from "@/lib/survey-features/question-loops/types";

/**
 * Reads choices from a source question using SurveyJS carry-forward semantics
 * (visibleChoices, isBuiltInChoice, isItemSelected).
 */
export function getChoicesFromSourceQuestion(
  source: QuestionSelectBase,
  selectionMode: SourceSelectionMode,
): ItemValue[] {
  if (source.isInDesignMode) {
    return [];
  }

  const res: ItemValue[] = [];
  let isSelected: boolean | undefined;
  if (selectionMode === SourceSelectionModes.SelectedOnly) {
    isSelected = true;
  } else if (selectionMode === SourceSelectionModes.UnselectedOnly) {
    isSelected = false;
  }

  const choices = source.visibleChoices;
  for (let i = 0; i < choices.length; i++) {
    const choice = choices[i];
    if (source.isBuiltInChoice(choice)) {
      continue;
    }

    if (isSelected === undefined) {
      res.push(choice);
      continue;
    }

    const itemsSelected = source.isItemSelected(choice);
    if ((itemsSelected && isSelected) || (!itemsSelected && !isSelected)) {
      res.push(choice);
    }
  }

  if (
    selectionMode === SourceSelectionModes.SelectedOnly &&
    !source.showOtherItem &&
    source.isOtherSelected &&
    source.otherValue
  ) {
    res.push(source.createItemValue(source.otherItem.value, source.otherValue));
  }

  return res;
}
