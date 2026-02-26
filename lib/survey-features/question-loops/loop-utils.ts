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

/**
 * Resolves the condition for a dynamic loop question into an index based condition that can be evaluated from the survey expression engine
 * @param condition - The condition to resolve
 * @param panelName - The name of the panel
 * @param currentIndex - The current index of the panel
 * @example
 * resolveDynamicLoopCondition("{panel.rateYourPurchase} = '5'", "loop1", 0) => "{loop1[0].rateYourPurchase} = '5'"
 * @returns The resolved condition
 */
function resolveDynamicLoopCondition(
  condition: string,
  panelName: string,
  currentIndex: number,
) {
  if (!condition) return "";

  // Regex looks for "{panel." (case insensitive)
  // and replaces it with "{PanelName[Index]."
  const absolutePath = `{${panelName}[${currentIndex}].`;
  return condition.replace(/\{panel\./gi, absolutePath);
}

export { isLoopQuestion, getAllLoopQuestions, resolveDynamicLoopCondition };
