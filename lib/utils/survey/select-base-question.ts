import { QuestionSelectBase, type Question } from "survey-core";

/**
 * Checks whether a question is a SelectBase type (has a choices collection).
 */
export function isSelectBaseQuestion(
  question: Question,
): question is QuestionSelectBase {
  return question instanceof QuestionSelectBase;
}
