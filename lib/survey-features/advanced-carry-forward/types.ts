import type { QuestionSelectBase } from 'survey-core';
import type { AdvancedCarryForwardModeValue } from './carry-forward-mode-values';

export interface AdvancedCarryForwardQuestion extends QuestionSelectBase {
  advancedCarryForwardEnabled?: boolean;
  advancedCarryForwardSources?: string[];
  advancedCarryForwardMode?: AdvancedCarryForwardModeValue | string;
  advancedCarryForwardPriorityItems?: string[];
  advancedCarryForwardMaxChoices?: number;
  edxDataListId?: string;
}

export interface CarryForwardVisibleQuestion {
  edxDataListId?: string;
  choicesByUrl?: { url?: string } | null;
  choicesFromQuestion?: string;
  advancedCarryForwardEnabled?: boolean;
}

export function isChoicesByUrlConfigured(obj: {
  choicesByUrl?: { url?: string } | null;
}): boolean {
  const url = obj.choicesByUrl?.url;
  return typeof url === 'string' && url.trim().length > 0;
}

export function isChoicesFromQuestionConfigured(obj: {
  choicesFromQuestion?: string;
}): boolean {
  return (
    typeof obj.choicesFromQuestion === 'string' &&
    obj.choicesFromQuestion.trim().length > 0
  );
}
