import { Helpers, SurveyModel } from "survey-core";

interface ExpressionRunnerContext {
  survey?: SurveyModel;
}

export function anyAnsweredFunction(
  params: unknown[],
): boolean {
  if (!Array.isArray(params) || params.length === 0) {
    return false;
  }

  return params.some((param) => !Helpers.isValueEmpty(param));
}

export function anyAnsweredByPrefixFunction(
  this: ExpressionRunnerContext,
  params: unknown[],
): boolean {
  const survey = this?.survey;
  const prefix = params?.[0];

  if (!survey || typeof prefix !== "string" || prefix.length === 0) {
    return false;
  }

  const questions = survey.getAllQuestions(false, false, false);

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    if (question.name.startsWith(prefix) && !question.isEmpty()) {
      return true;
    }
  }

  return false;
}
