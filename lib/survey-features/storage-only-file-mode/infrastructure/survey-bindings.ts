import type { Model, Question, QuestionAddedEvent } from "survey-core";
import {
  STORAGE_ONLY_FILE_MODE_QUESTION_TYPES,
  STORE_DATA_AS_TEXT_PROPERTY,
  type StorageOnlyFileModeQuestionType,
} from "../constants";

type StorageOnlyFileModeQuestion = Question & {
  [STORE_DATA_AS_TEXT_PROPERTY]?: boolean;
};

function isStorageOnlyFileModeQuestion(
  question: Question,
): question is StorageOnlyFileModeQuestion {
  return (STORAGE_ONLY_FILE_MODE_QUESTION_TYPES as readonly string[]).includes(
    question.getType() as StorageOnlyFileModeQuestionType,
  );
}

function enforceStorageOnlyFileMode(
  question: StorageOnlyFileModeQuestion,
): void {
  if (question.storeDataAsText !== false) {
    question.storeDataAsText = false;
  }
}

function handleQuestionAdded(_: Model, options: QuestionAddedEvent): void {
  if (isStorageOnlyFileModeQuestion(options.question)) {
    enforceStorageOnlyFileMode(options.question);
  }
}

/**
 * Forces every file/signaturepad question on the survey to upload to storage
 * (storeDataAsText = false) — questions already in the JSON and any added
 * afterwards. Pair with registerStorageOnlyFileModeGlobals, which hides the
 * property from the Creator property grid so authors can't flip it back.
 */
export function bindStorageOnlyFileModeToSurvey(survey: Model): () => void {
  survey
    .getAllQuestions(false, false, true)
    .filter(isStorageOnlyFileModeQuestion)
    .forEach(enforceStorageOnlyFileMode);

  survey.onQuestionAdded.add(handleQuestionAdded);

  return () => {
    survey.onQuestionAdded.remove(handleQuestionAdded);
  };
}
