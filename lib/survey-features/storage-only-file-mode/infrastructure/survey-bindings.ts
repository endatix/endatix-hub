import type { Model, Question, QuestionAddedEvent } from "survey-core";
import {
  STORAGE_ONLY_FILE_MODE_QUESTION_TYPES,
  STORE_DATA_AS_TEXT_PROPERTY,
  WAIT_FOR_UPLOAD_PROPERTY,
  type StorageOnlyFileModeQuestionType,
} from "../constants";

type StorageOnlyFileModeQuestion = Question & {
  [STORE_DATA_AS_TEXT_PROPERTY]?: boolean;
  [WAIT_FOR_UPLOAD_PROPERTY]?: boolean;
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
  // Uploads are async once storeDataAsText is false — without waitForUpload,
  // a respondent can complete the survey while the upload is still in
  // flight. Set explicitly (rather than changing the Serializer default,
  // which is also false) so it always serializes. Mirrors AudioQuestionModel.
  if (question.waitForUpload !== true) {
    question.waitForUpload = true;
  }
}

function handleQuestionAdded(_: Model, options: QuestionAddedEvent): void {
  if (isStorageOnlyFileModeQuestion(options.question)) {
    enforceStorageOnlyFileMode(options.question);
  }
}

/**
 * Forces every file/signaturepad question on the survey to upload to storage
 * (storeDataAsText = false, waitForUpload = true) — questions already in the
 * JSON and any added afterwards. Pair with registerStorageOnlyFileModeGlobals,
 * which hides the property from the Creator property grid so authors can't
 * flip it back.
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
