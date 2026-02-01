import { Result } from "@/lib/result";

const USER_FILES_PREFIX = "s/";

/**
 * Builds the folder path for a submission file in the USER_FILES container.
 * @param formId - The form ID
 * @param submissionId - The submission ID
 * @returns A Result containing the folder path or a validation error
 */
function buildUseFileFolderPath(
  formId: string,
  submissionId: string,
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

  const folderPathResult = buildUseFileFolderPath(formId, submissionId);
  if (Result.isError(folderPathResult)) {
    return folderPathResult;
  }

  const folderPath = folderPathResult.value;

  return Result.success(`${folderPath}/${fileNameTrimmed}`);
}

/**
 * Storage request header names.
 */
const StorageHeaderNames = Object.freeze({
  FORM_ID: "edx-form-id",
  SUBMISSION_ID: "edx-submission-id",
  FORM_LANG: "edx-form-lang",
  QUESTION_ID: "edx-question-id",
} as const);

/** Union of header name keys (e.g. for typing a key variable). */
type StorageHeaderName = keyof typeof StorageHeaderNames;

/** Base user file context */
export interface UserFileContext {
  formId: string;
  submissionId?: string;
  questionId: string;
  formLang?: string;
}

interface UserFileMetadataProps extends UserFileContext {
  fileName: string;
  fileType?: string;
  fileContentDisposition?: string;
}

interface UserFileMetadata {
  formId: string;
  submissionId: string;
  fileName: string;
  fileType: string;
  questionId: string;
  formLang?: string;
  fileContentDisposition?: string;
}

/** Headers object for the upload request (edx-form-id, edx-submission-id, etc.). */
export type UserFileRequestHeaders = Record<
  (typeof StorageHeaderNames)[keyof typeof StorageHeaderNames],
  string
>;

/**
 * Builds request headers for the user file upload API from the same context used for metadata.
 * Use with buildUserFileMetadata so headers and blob metadata stay in sync.
 */
function buildUserFileRequestHeaders(
  context: UserFileContext,
): UserFileRequestHeaders {
  return {
    [StorageHeaderNames.FORM_ID]: context.formId,
    [StorageHeaderNames.SUBMISSION_ID]: context.submissionId ?? "",
    [StorageHeaderNames.FORM_LANG]: context.formLang ?? "",
    [StorageHeaderNames.QUESTION_ID]: context.questionId,
  };
}

/**
 * Builds blob metadata for a user file. Use the same context as buildUserFileRequestHeaders
 * (plus fileName and fileType) so headers and metadata stay in sync.
 */
function buildUserFileMetadata(props: UserFileMetadataProps): UserFileMetadata {
  return {
    formId: props.formId,
    fileName: props.fileName,
    submissionId: props.submissionId ?? "no submission id",
    fileType: props.fileType ?? "application/octet-stream",
    questionId: props.questionId,
    formLang: props.formLang ?? "",
    fileContentDisposition: props.fileContentDisposition ?? "inline",
  };
}

export {
  StorageHeaderNames,
  type StorageHeaderName,
  USER_FILES_PREFIX,
  buildUserFilePath,
  buildUseFileFolderPath,
  buildUserFileMetadata,
  buildUserFileRequestHeaders,
};
