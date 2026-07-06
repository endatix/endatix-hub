import {
  ItemValue,
  Question,
  QuestionSelectBase,
  SurveyModel,
} from "survey-core";
import { isSelectBaseQuestion, extractUniqueChoicesBy } from '@/lib/utils/survey';
import { getChoicesFromSourceQuestion } from "@/lib/utils/survey/get-choices-from-source-question";
import {
  DynamicLoopModel,
  SourceSelectionMode,
  SourceSelectionModes,
} from "./types";
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
  return condition.replaceAll(/\{panel\./gi, absolutePath);
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

  const suffledCopy = [...array];
  for (let i = suffledCopy.length - 1; i > 0; i--) {
    const j = getRandomIndex(i + 1);
    [suffledCopy[i], suffledCopy[j]] = [suffledCopy[j], suffledCopy[i]];
  }

  return suffledCopy;
}

function isEmptyString(condition: string | undefined): boolean {
  if (!condition || typeof condition !== "string") return true;
  return condition.trim() === "";
}

/**
 * Checks if the condition is a non-empty string
 * @param condition - The condition to check
 * @returns True if the condition is a non-empty string, false otherwise
 */
function isNonEmptyCondition(
  condition: string | undefined,
): condition is string {
  return !isEmptyString(condition);
}

/**
 * Gets all the choice base questions in the survey
 * @param survey - The survey to get the choice base questions from
 * @returns An array of QuestionSelectBase choice base questions
 */
function getAllSelectBasedQuestions(survey: SurveyModel): QuestionSelectBase[] {
  if (!survey) return [];

  return survey.getAllQuestions().filter(isSelectBaseQuestion);
}

/**
 * Gets the queschoices for loop question based on selection mode
 * @param question - The loop question to get the choices from
 * @param selectionMode - The selection mode to get the choices for
 * @returns An array of choices for the loop question
 */
function getLoopChoicesFromQuestion(
  question: Question,
  selectionMode: SourceSelectionMode,
): ItemValue[] {
  const isKnownMode =
    selectionMode === SourceSelectionModes.All ||
    selectionMode === SourceSelectionModes.SelectedOnly ||
    selectionMode === SourceSelectionModes.UnselectedOnly;

  if (
    isKnownMode &&
    isSelectBaseQuestion(question) &&
    question.getType() !== "ranking"
  ) {
    return getChoicesFromSourceQuestion(question, selectionMode);
  }

  const allChoices = question.choices || [];

  if (selectionMode === SourceSelectionModes.All) {
    return allChoices;
  }

  let selectedValues: any[] = [];
  if (question.value != null) {
    selectedValues = Array.isArray(question.value)
      ? question.value
      : [question.value];
  }

  switch (selectionMode) {
    case SourceSelectionModes.SelectedOnly:
      return allChoices.filter((choice: ItemValue) =>
        selectedValues.includes(choice.value),
      );

    case SourceSelectionModes.UnselectedOnly:
      return allChoices.filter(
        (choice: ItemValue) => !selectedValues.includes(choice.value),
      );

    default:
      return [];
  }
}

/**
 * Gets all unique available choices across multiple questions.
 */
function getAllUniqueChoices(
  questions: QuestionSelectBase[],
  formatChoiceText?: (
    question: QuestionSelectBase,
    choice: ItemValue,
  ) => string,
): ItemValue[] {
  return extractUniqueChoicesBy(questions, (q) => q.choices, formatChoiceText);
}

/**
 * Gets only the unique selected choices across multiple questions.
 */
function getUniqueSelectedChoices(
  questions: QuestionSelectBase[],
  formatChoiceText?: (
    question: QuestionSelectBase,
    choice: ItemValue,
  ) => string,
): ItemValue[] {
  return extractUniqueChoicesBy(
    questions,
    (question: any) => {
      const rawValue = question.value;
      if (rawValue === undefined || rawValue === null || rawValue === "")
        return [];

      // Multi-select questions
      if (Array.isArray(rawValue)) {
        return question.selectedChoices || [];
      }

      // Single-select (Radiogroup, Dropdown)
      if (question.selectedItem) {
        return [question.selectedItem];
      }

      // Fallback: Value exists but doesn't match a choice object
      return [question.createItemValue(rawValue, String(rawValue))];
    },
    formatChoiceText,
  );
}

export {
  isLoopQuestion,
  getAllLoopQuestions,
  resolveDynamicLoopCondition,
  shuffleArray,
  isNonEmptyCondition,
  getLoopChoicesFromQuestion,
  isSelectBaseQuestion,
  getAllSelectBasedQuestions,
  getAllUniqueChoices,
  getUniqueSelectedChoices,
  extractUniqueChoicesBy,
};
