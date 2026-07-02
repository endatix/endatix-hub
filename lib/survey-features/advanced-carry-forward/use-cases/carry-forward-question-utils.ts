import type { Question, QuestionSelectBase } from 'survey-core';
import { isSelectBaseQuestion } from '@/lib/survey-features/question-loops/loop-utils';
import { ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY } from '../constants';
import type { AdvancedCarryForwardQuestion } from '../types';

export function isAdvancedCarryForwardEnabled(
  question: Question | null | undefined,
): question is AdvancedCarryForwardQuestion {
  if (!question) {
    return false;
  }

  return (
    question.getPropertyValue(ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY) === true
  );
}

export function getAllCarryForwardTargets(
  survey: { getAllQuestions: () => Question[] },
): AdvancedCarryForwardQuestion[] {
  if (!survey) {
    return [];
  }

  return survey
    .getAllQuestions()
    .filter(isAdvancedCarryForwardEnabled) as AdvancedCarryForwardQuestion[];
}

export function getCarryForwardSourceQuestions(
  survey: { getQuestionByName: (name: string) => Question | null },
  target: AdvancedCarryForwardQuestion,
): QuestionSelectBase[] {
  const sources = target.advancedCarryForwardSources ?? [];

  return sources
    .map((sourceName) => survey.getQuestionByName(sourceName))
    .filter(isSelectBaseQuestion);
}
