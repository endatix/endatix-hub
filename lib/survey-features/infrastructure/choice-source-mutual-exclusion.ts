import { DATA_LIST_PROPERTY_NAME } from "@/lib/survey-features/data-lists/constants";
import { CARRY_FORWARD_ENABLED_PROPERTY } from "@/lib/survey-features/carry-forward/constants";
import {
  isChoicesByUrlConfigured,
  isChoicesFromQuestionConfigured,
} from "@/lib/survey-features/carry-forward/types";

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
 * Whether Carry forward is active at runtime on a question.
 */
export function isAdvancedCarryForwardRuntimeEnabled(question: {
  getPropertyValue: (name: string) => unknown;
  choicesByUrl?: { url?: string } | null;
  choicesFromQuestion?: string;
}): boolean {
  if (
    question.getPropertyValue(CARRY_FORWARD_ENABLED_PROPERTY) !== true
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
