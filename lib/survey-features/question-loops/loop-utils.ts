import { Question, SurveyModel } from "survey-core";
import { DynamicLoopModel, PanelItem } from "./types";
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

/** Returns a random integer in [0, max) using crypto. */
function getRandomIndex(max: number): number {
  const rand = new Uint32Array(1);
  globalThis.crypto.getRandomValues(rand);
  return rand[0] % max;
}

/**
 * Shuffles an array of items
 * @param array - The array to shuffle
 * @returns The shuffled array
 */
function shuffleArray<T>(array: T[]): T[] {
  if (!Array.isArray(array) || array.length === 0) {
    return array;
  }

  for (let i = array.length - 1; i > 0; i--) {
    const j = getRandomIndex(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

export {
  isLoopQuestion,
  getAllLoopQuestions,
  resolveDynamicLoopCondition,
  shuffleArray,
};
