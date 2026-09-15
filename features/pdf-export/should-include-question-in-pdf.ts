import { Question, QuestionNonValue } from "survey-core";

export function shouldIncludeQuestionInPdf(question: Question): boolean {
  if (question instanceof QuestionNonValue) {
    return false;
  }

  if (!question.isVisibleInSurvey) {
    return false;
  }

  if (typeof question.isEmpty === "function" && question.isEmpty()) {
    return false;
  }

  return true;
}
