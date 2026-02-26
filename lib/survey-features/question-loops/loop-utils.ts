import { Question, SurveyModel } from "survey-core";
import { DynamicLoopModel } from "./types";
import { PANEL_QUESTION_TYPE } from "./dynamic-loop-question";

/**
 * Checks if the question is a loop question
 * @param question - The question to check
 * @returns True if the question is a loop question, false otherwise
 */
function isLoopQuestion(question: Question): question is DynamicLoopModel {
  if (question?.getType() !== PANEL_QUESTION_TYPE) {
    return false;
  }

  return Array.isArray(question.loopSource) && question.loopSource.length > 0;
}

/**
 * Gets all the loop questions in the survey
 * @param survey - The survey to get the loop questions from
 * @returns An array of loop questions
 */
function getAllLoopQuestions(survey: SurveyModel): DynamicLoopModel[] {
  if (!survey) return [];

  return survey.getAllQuestions().filter(isLoopQuestion);
}

export { isLoopQuestion, getAllLoopQuestions };
