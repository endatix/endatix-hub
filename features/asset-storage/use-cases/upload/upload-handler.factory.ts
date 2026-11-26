import type { SurveyModel, UploadFilesEvent } from "survey-core";
import type { UploadFileEvent } from "survey-creator-core";
import { Result, type ResultType } from "@/lib/result";
import { withBasePath } from "@/lib/hosting";
import type { ContentItemType } from "../../types";
import type { UploadUrlDescriptor } from "../../infrastructure/core";
import type { StorageReadRuntime } from "../../infrastructure/storage-read-runtime";
import { buildPublicStorageGateBody } from "../../infrastructure/storage-read-request";
import {
  fetchUploadUrls,
  prepareUploadBytes,
  processAndUploadFile,
  type ProcessAndUploadSuccess,
  type PreparedUploadBytes,
  type UploadUrlsData,
} from "./upload.utils";

const USER_UPLOAD_URLS = withBasePath("/api/public/v0/storage/upload-urls");
const USER_RESIZE_URL = withBasePath("/api/public/v0/storage/resize-image");

function buildPerFileMaps(prepared: PreparedUploadBytes[]): {
  fileTypes: Record<string, string>;
  fileStates: Record<string, PreparedUploadBytes["fileState"]>;
} {
  const fileTypes: Record<string, string> = {};
  const fileStates: Record<string, PreparedUploadBytes["fileState"]> = {};
  for (const p of prepared) {
    fileTypes[p.file.name] = p.contentType;
    fileStates[p.file.name] = p.fileState;
  }
  return { fileTypes, fileStates };
}

export interface UserUploadConfig {
  formId: string;
  getSubmissionId?: () => string | undefined;
  surveyModel: SurveyModel | null;
  onSubmissionIdChange?: (newSubmissionId: string) => void;
  isResizeEnabled: boolean;
  getReadRuntime?: () => StorageReadRuntime | null;
}

/**
 * Creates a user upload handler.
 * @param config - The configuration for the user upload handler.
 * @returns The user upload handler.
 */
export function createUserUpload(config: UserUploadConfig) {
  const {
    formId,
    getSubmissionId,
    surveyModel,
    onSubmissionIdChange,
    isResizeEnabled,
    getReadRuntime,
  } = config;

  return async function handleUserUpload(
    _sender: SurveyModel,
    options: UploadFilesEvent,
  ): Promise<void> {
    if (options.files.length === 0) {
      options.callback([], []);
      return;
    }

    const currentSubmissionId = getSubmissionId?.();
    const resizeUrl = isResizeEnabled ? USER_RESIZE_URL : undefined;

    const prepared = await Promise.all(
      options.files.map((file) => prepareUploadBytes(file, resizeUrl)),
    );

    const { fileTypes, fileStates } = buildPerFileMaps(prepared);
    const gateBody = buildPublicStorageGateBody(
      { formId, submissionId: currentSubmissionId },
      getReadRuntime?.(),
    );

    const sasResult = await fetchUploadUrls(USER_UPLOAD_URLS, {
      fileNames: options.files.map((f) => f.name),
      ...(gateBody.submissionId ? { submissionId: gateBody.submissionId } : {}),
      formId: gateBody.formId,
      formLocale: surveyModel?.locale ?? "",
      fileTypes,
      fileStates,
      questionName: options.question?.name ?? "",
      ...(gateBody.token
        ? {
            token: gateBody.token,
            ...(gateBody.tokenType ? { tokenType: gateBody.tokenType } : {}),
          }
        : {}),
    });

    if (Result.isError(sasResult)) {
      options.callback([], [sasResult.message]);
      return;
    }

    const sasData: UploadUrlsData = sasResult.value;

    if (
      sasData.submissionId &&
      sasData.submissionId !== (currentSubmissionId ?? "")
    ) {
      onSubmissionIdChange?.(sasData.submissionId);
    }

    const uploadResults = await Promise.all(
      prepared.map(
        async ({
          file,
          buffer,
        }): Promise<ResultType<ProcessAndUploadSuccess>> => {
          const entry = sasData.uploads[file.name];
          if (!entry) {
            return Result.error(`No URL for ${file.name}`);
          }
          if ("error" in entry) {
            return Result.error(entry.error);
          }

          const descriptor: UploadUrlDescriptor = entry;

          return processAndUploadFile(file, descriptor, buffer);
        },
      ),
    );

    const successes = uploadResults
      .filter((result) => Result.isSuccess(result))
      .map(({ value }) => ({ file: value.file, content: value.url }));

    const errors = uploadResults
      .filter((result) => Result.isError(result))
      .map((result) => result.message);

    options.callback(successes, errors);
  };
}

// ─── Content (creator) upload ─────────────────────────────────────────────

const CONTENT_UPLOAD_URLS = withBasePath(
  "/api/hub/v0/storage/content/upload-urls",
);
const CONTENT_RESIZE_URL = withBasePath("/api/hub/v0/storage/resize-image");

export interface ContentUploadConfig {
  itemId: string;
  itemType: ContentItemType;
  questionName: string;
  isResizeEnabled: boolean;
}

/**
 * Creates a content upload handler.
 * @param config - The configuration for the content upload handler.
 * @returns The content upload handler.
 */
export function createContentUpload(config: ContentUploadConfig) {
  return async function handleContentUpload(
    _sender: unknown,
    options: UploadFileEvent,
  ): Promise<void> {
    const files = options.files ?? [];
    if (files.length === 0) return;
    const result = await uploadContentFiles(config, files);
    if (Result.isError(result)) options.callback("error", result.message);
    else options.callback("success", result.value[0]?.url ?? "");
  };
}

export async function uploadContentFiles(config: ContentUploadConfig, files: File[]) {
  const { itemId, itemType, questionName, isResizeEnabled } = config;
  const resizeUrl = isResizeEnabled ? CONTENT_RESIZE_URL : undefined;
  const prepared = await Promise.all(files.map(file => prepareUploadBytes(file, resizeUrl)));
  const grants = await fetchUploadUrls(CONTENT_UPLOAD_URLS, {
    itemId,
    itemType,
    fileNames: files.map(file => file.name),
    questionName,
    ...buildPerFileMaps(prepared),
  });
  if (Result.isError(grants)) return grants;
  const uploads = await Promise.all(prepared.map(file => putContentFile(file, grants.value)));
  const error = uploads.find(Result.isError);
  if (error && Result.isError(error)) return error;
  return Result.success(uploads.filter(Result.isSuccess).map(upload => upload.value));
}

async function putContentFile({ file, buffer }: PreparedUploadBytes, grants: UploadUrlsData) {
  const entry = grants.uploads[file.name];
  if (!entry) return Result.error<ProcessAndUploadSuccess>(`No upload URL for ${file.name}`);
  if ("error" in entry) return Result.error<ProcessAndUploadSuccess>(entry.error);
  return processAndUploadFile(file, entry, buffer);
}
