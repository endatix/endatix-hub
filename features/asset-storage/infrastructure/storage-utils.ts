import { Result } from "@/lib/result";
import type {
  ContentItemType,
  UserFileMetadata,
  UserFileRequestContext,
} from "../types";

const USER_FILES_PREFIX = "s/";

/** Prefix for content folder paths: "f" (form) or "t" (template). */
const CONTENT_ROOT_FORM = "f";
const CONTENT_ROOT_TEMPLATE = "t";

/**
 * Builds the folder path for a submission file in the USER_FILES container.
 * @param formId - The form ID
 * @param submissionId - The submission ID
 * @returns A Result containing the folder path or a validation error
 */
function buildUserFileFolderPath(
  formId: string,
  submissionId: string | undefined,
): Result<string> {
  if (!formId) {
    return Result.validationError("Form ID is required");
  }

  if (!submissionId) {
    return Result.validationError("Submission ID is required");
  }

  return Result.success(`${USER_FILES_PREFIX}${formId}/${submissionId}`);
}

/**
 * Builds the file path (Blob Name) for a submission file in the USER_FILES container.
 * Returns relative path similar to s/{formId}/{submissionId}/{fileName}.
 *
 * @param formId - The form ID
 * @param submissionId - The submission ID
 * @param fileName - The file name
 * @returns A Result containing the file path or a validation error
 */
function buildUserFilePath(
  formId: string,
  submissionId: string,
  fileName: string,
): Result<string> {
  const fileNameTrimmed = fileName?.trim() ?? "";

  if (!fileNameTrimmed) return Result.validationError("File name is required");

  const folderPathResult = buildUserFileFolderPath(formId, submissionId);
  if (Result.isError(folderPathResult)) {
    return folderPathResult;
  }

  const folderPath = folderPathResult.value;

  return Result.success(`${folderPath}/${fileNameTrimmed}`);
}

/**
 * Builds the folder path for a content file in the CONTENT container.
 * Convention: f/{itemId} for form, t/{itemId} for template.
 *
 * @param itemType - "form" or "template"
 * @param itemId - The form or template ID
 * @returns A Result containing the folder path or a validation error
 */
function buildContentFolderPath(
  itemType: ContentItemType,
  itemId: string,
): Result<string> {
  if (!itemId?.trim()) {
    return Result.validationError("Item ID is required");
  }
  const root = itemType === "form" ? CONTENT_ROOT_FORM : CONTENT_ROOT_TEMPLATE;
  return Result.success(`${root}/${itemId.trim()}`);
}

/**
 * Storage request header names.
 */
const StorageHeaderNames = Object.freeze({
  FORM_ID: "edx-form-id",
  SUBMISSION_ID: "edx-submission-id",
  FORM_LANG: "edx-form-lang",
  QUESTION_NAME: "edx-question-name",
} as const);

/** Union of header name keys (e.g. for typing a key variable). */
type StorageHeaderName = keyof typeof StorageHeaderNames;

/** Headers object for the upload request (edx-form-id, edx-submission-id, etc.). */
export type UserFileRequestHeaders = Record<
  (typeof StorageHeaderNames)[keyof typeof StorageHeaderNames],
  string
>;

/**
 * Builds request headers for the user file upload API from context.
 * Use with buildUserFileMetadata so headers and blob metadata stay in sync.
 */
function buildUserFileRequestHeaders(
  context: UserFileRequestContext,
): UserFileRequestHeaders {
  return {
    [StorageHeaderNames.FORM_ID]: context.formId ?? "",
    [StorageHeaderNames.SUBMISSION_ID]: context.submissionId ?? "",
    [StorageHeaderNames.FORM_LANG]: context.formLang ?? "",
    [StorageHeaderNames.QUESTION_NAME]: context.questionName ?? "",
  };
}

/**
 * Applies defaults to user file metadata. Use with toBlobUploadOptions.
 */
function buildUserFileMetadata(meta: UserFileMetadata): UserFileMetadata {
  const result: UserFileMetadata = {
    kind: "user",
    uploadedBy: meta.uploadedBy,
    displayName: meta.displayName,
    contentType: meta.contentType ?? "application/octet-stream",
    formId: meta.formId,
    submissionId: meta.submissionId ?? "no submission id",
    formLang: meta.formLang ?? "",
    fileState: meta.fileState,
    questionName: meta.questionName,
  };
  if (meta.sizeInBytes !== undefined) result.sizeInBytes = meta.sizeInBytes;
  if (meta.originalFileName !== undefined)
    result.originalFileName = meta.originalFileName;
  return result;
}

export {
  StorageHeaderNames,
  type StorageHeaderName,
  USER_FILES_PREFIX,
  buildUserFilePath,
  buildUserFileFolderPath,
  buildContentFolderPath,
  buildUserFileMetadata,
  buildUserFileRequestHeaders,
};
