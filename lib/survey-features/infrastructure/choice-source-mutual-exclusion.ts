import { DATA_LIST_PROPERTY_NAME } from "@/lib/survey-features/data-lists/constants";
import { ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY } from "@/lib/survey-features/advanced-carry-forward/constants";
import {
  isChoicesByUrlConfigured,
  isChoicesFromQuestionConfigured,
} from "@/lib/survey-features/advanced-carry-forward/types";

export interface ChoiceSourceVisibleQuestion {
  edxDataListId?: string;
  choicesByUrl?: { url?: string } | null;
  choicesFromQuestion?: string;
  advancedCarryForwardEnabled?: boolean;
}

/**
 * Whether the manual / advanced choice-source UI should be available in Creator.
 */
export function isChoiceSourceSectionAvailable(
  obj: ChoiceSourceVisibleQuestion,
): boolean {
  return (
    !obj.edxDataListId &&
    !isChoicesByUrlConfigured(obj) &&
    !isChoicesFromQuestionConfigured(obj)
  );
}

/**
 * Whether advanced carry forward is active at runtime on a question.
 */
export function isAdvancedCarryForwardRuntimeEnabled(question: {
  getPropertyValue: (name: string) => unknown;
  choicesByUrl?: { url?: string } | null;
  choicesFromQuestion?: string;
}): boolean {
  if (
    question.getPropertyValue(ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY) !== true
  ) {
    return false;
  }

  const dataListId = question.getPropertyValue(DATA_LIST_PROPERTY_NAME);

  return (
    !dataListId &&
    !isChoicesByUrlConfigured({
      choicesByUrl: question.choicesByUrl as { url?: string } | null,
    }) &&
    !isChoicesFromQuestionConfigured(question)
  );
}
