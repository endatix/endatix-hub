import {
  ItemValue,
  Question,
  QuestionSelectBase,
  SurveyModel,
} from "survey-core";
import {
  ChoiceValue,
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
 * Checks if the question is a select base question.
 * As opposed to providing list of question types, this function checks if the question is an instance of QuestionSelectBase, which means it has a choices property.
 * @param question - The question to check
 * @returns True if the question is a select base question, false otherwise
 */
function isSelectBaseQuestion(
  question: Question,
): question is QuestionSelectBase {
  return question instanceof QuestionSelectBase;
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
  // Note: Ensure `q.selectedChoices` is an array of ItemValue in your types,
  // as single-selects (Radiogroup/Dropdown) might use a different property in SurveyJS.
  return extractUniqueChoicesBy(
    questions,
    (q) => q.selectedChoices,
    formatChoiceText,
  );
}

/**
 * Base engine to extract and deduplicate choices from a list of questions.
 */
function extractUniqueChoicesBy(
  questions: QuestionSelectBase[],
  choiceSelector: (question: QuestionSelectBase) => ItemValue[],
  formatChoiceText?: (
    question: QuestionSelectBase,
    choice: ItemValue,
  ) => string,
): ItemValue[] {
  const choicesMap = new Map<ChoiceValue, ItemValue>();

  for (const question of questions) {
    const choicesToProcess = choiceSelector(question) || [];

    for (const choice of choicesToProcess) {
      if (choicesMap.has(choice.value)) continue;

      const text = formatChoiceText
        ? formatChoiceText(question, choice)
        : choice.text || choice.value; // Fallback to value if text is missing

      choicesMap.set(
        choice.value,
        question.createItemValue(choice.value, text),
      );
    }
  }

  return Array.from(choicesMap.values());
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
  extractUniqueChoicesBy
};
