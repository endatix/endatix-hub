import type { ItemValue, QuestionSelectBase, SurveyModel } from 'survey-core';
import type { SourceSelectionMode } from '@/lib/survey-features/question-loops/types';

export interface AdvancedCarryForwardQuestion extends QuestionSelectBase {
  advancedCarryForwardEnabled?: boolean;
  advancedCarryForwardSources?: string[];
  advancedCarryForwardMode?: SourceSelectionMode;
  advancedCarryForwardPriorityItems?: string[];
  advancedCarryForwardMaxChoices?: number;
  edxDataListId?: string;
  choicesByUrl?: { url?: string } | null;
  choicesFromQuestion?: string;
}

export interface CarryForwardVisibleQuestion {
  edxDataListId?: string;
  choicesByUrl?: { url?: string } | null;
  choicesFromQuestion?: string;
  advancedCarryForwardEnabled?: boolean;
}

export function isChoicesByUrlConfigured(
  obj: Pick<CarryForwardVisibleQuestion, 'choicesByUrl'>,
): boolean {
  const url = obj.choicesByUrl?.url;
  return typeof url === 'string' && url.trim().length > 0;
}

export function isChoicesFromQuestionConfigured(
  obj: Pick<CarryForwardVisibleQuestion, 'choicesFromQuestion'>,
): boolean {
  return (
    typeof obj.choicesFromQuestion === 'string' &&
    obj.choicesFromQuestion.trim().length > 0
  );
}

export type CarryForwardSourceChoice = {
  value: string;
  text: string;
};

export type CarryForwardPriorityChoice = ItemValue;

export interface CarryForwardPropertyContext {
  survey: SurveyModel;
  name: string;
  advancedCarryForwardSources?: string[];
}
