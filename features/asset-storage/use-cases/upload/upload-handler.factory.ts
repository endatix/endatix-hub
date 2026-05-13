import type { SurveyModel, UploadFilesEvent } from "survey-core";
import type { UploadFileEvent } from "survey-creator-core";
import { Result, type ResultType } from "@/lib/result";
import type { ContentItemType, FileMetadata } from "../../types";
import type { UploadUrlDescriptor } from "../../infrastructure/storage-gateway";
import { buildUserFileMetadata } from "../../infrastructure/storage-utils";
import {
  fetchUploadUrls,
  processAndUploadFile,
  type ProcessAndUploadSuccess,
  type UploadUrlsData,
} from "./upload.utils";

const USER_UPLOAD_URLS = "/api/public/v0/storage/upload-urls";
const USER_RESIZE_URL = "/api/public/v0/storage/resize-image";

export interface UserUploadConfig {
  formId: string;
  getSubmissionId?: () => string | undefined;
  surveyModel: SurveyModel | null;
  onSubmissionIdChange?: (newSubmissionId: string) => void;
  isResizeEnabled: boolean;
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
    const sasResult = await fetchUploadUrls(USER_UPLOAD_URLS, {
      fileNames: options.files.map((f) => f.name),
      submissionId: currentSubmissionId,
      formId,
      formLocale: surveyModel?.locale ?? "",
    });

    if (Result.isError(sasResult)) {
      options.callback([], [sasResult.message]);
      return;
    }

    const sasData: UploadUrlsData = sasResult.value;

    if (sasData.submissionId && sasData.submissionId !== (currentSubmissionId ?? "")) {
      onSubmissionIdChange?.(sasData.submissionId);
    }

    const uploadResults = await Promise.all(
      options.files.map(
        async (file): Promise<ResultType<ProcessAndUploadSuccess>> => {
          const entry = sasData.uploads[file.name];
          if (!entry) {
            return Result.error(`No URL for ${file.name}`);
          }
          if ("error" in entry) {
            return Result.error(entry.error);
          }

          const descriptor: UploadUrlDescriptor = entry;

          const metadata: FileMetadata = buildUserFileMetadata({
            kind: "user",
            uploadedBy: sasData.userId ?? "anonymous",
            formId,
            submissionId: sasData.submissionId ?? currentSubmissionId ?? "",
            questionName: options.question?.name ?? "",
            formLang: surveyModel?.locale ?? "",
            displayName: file.name,
            contentType: file.type,
          });

          return processAndUploadFile(
            file,
            descriptor,
            metadata,
            isResizeEnabled ? USER_RESIZE_URL : undefined,
          );
        },
      ),
    );

    const successes = uploadResults.filter(Result.isSuccess).map((result) => {
      return {
        file: result.value.file,
        content: result.value.url,
      };
    });

    const errors = uploadResults
      .filter(Result.isError)
      .map((result) => result.message);

    options.callback(successes, errors);
  };
}

// ─── Content (creator) upload ─────────────────────────────────────────────

const CONTENT_UPLOAD_URLS = "/api/hub/v0/storage/content/upload-urls";
const CONTENT_RESIZE_URL = "/api/hub/v0/storage/resize-image";

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
  const { itemId, itemType, questionName, isResizeEnabled } = config;

  return async function handleContentUpload(
    _sender: unknown,
    options: UploadFileEvent,
  ): Promise<void> {
    const files = options.files ?? [];
    if (files.length === 0) return;

    const sasResult = await fetchUploadUrls(CONTENT_UPLOAD_URLS, {
      itemId,
      itemType,
      fileNames: files.map((f) => f.name),
      questionName,
    });

    if (Result.isError(sasResult)) {
      options.callback("error", sasResult.message);
      return;
    }

    const uploadUrlsData: UploadUrlsData = sasResult.value;

    const uploadResults = await Promise.all(
      files.map(async (file): Promise<ResultType<ProcessAndUploadSuccess>> => {
        const entry = uploadUrlsData.uploads[file.name];
        if (!entry) {
          return Result.error("No upload URL");
        }
        if ("error" in entry) {
          return Result.error(entry.error);
        }

        const descriptor: UploadUrlDescriptor = entry;

        const meta = uploadUrlsData.uploadMetadata ?? {
          userId: "",
          itemId,
          contentItemType: itemType,
          questionName,
        };

        const metadata: FileMetadata = {
          kind: "content",
          uploadedBy: meta.userId,
          itemId: meta.itemId,
          contentItemType: meta.contentItemType as ContentItemType,
          displayName: file.name,
          contentType: file.type,
          questionName: meta.questionName,
        };

        return processAndUploadFile(
          file,
          descriptor,
          metadata,
          isResizeEnabled ? CONTENT_RESIZE_URL : undefined,
        );
      }),
    );

    const firstError = uploadResults.find(Result.isError);
    if (firstError && Result.isError(firstError)) {
      options.callback("error", firstError.message);
      return;
    }

    const successes = uploadResults
      .filter(Result.isSuccess)
      .map((r) => r.value);
    options.callback("success", successes[0]?.url ?? "");
  };
}
