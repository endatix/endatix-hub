export const STORAGE_ONLY_FILE_MODE_QUESTION_TYPES = [
  "file",
  "signaturepad",
] as const;

export type StorageOnlyFileModeQuestionType =
  (typeof STORAGE_ONLY_FILE_MODE_QUESTION_TYPES)[number];

export const STORE_DATA_AS_TEXT_PROPERTY = "storeDataAsText";

export const STORAGE_ONLY_FILE_MODE_CREATOR_BOUND_KEY =
  "__endatixStorageOnlyFileModeCreatorBound";
