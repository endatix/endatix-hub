"use client";

import { use, useCallback, useMemo } from "react";
import {
  ClearFilesEvent,
  DownloadFileEvent,
  SurveyModel,
  UploadFilesEvent,
} from "survey-core";
import { BlockBlobClient } from "@azure/storage-blob";
import { Result } from "@/lib/result";
import {
  AssetStorageTokens,
  useAssetStorage,
} from "../../ui/asset-storage.context";

interface UseStorageUploadProps {
  formId: string;
  submissionId?: string;
  surveyModel: SurveyModel | null;
  onSubmissionIdChange?: (newSubmissionId: string) => void;
  readTokenPromises?: AssetStorageTokens;
}

interface UploadFilesToBlobProps extends UseStorageUploadProps {
  files: File[];
  options: UploadFilesEvent;
}

interface UploadFilesToServerProps extends UseStorageUploadProps {
  files: File[];
}

interface UploadedFile {
  name: string;
  url: string;
}

interface UploadResult {
  data: Array<unknown>;
  errors: Array<string>;
}

const UploadResult = {
  empty(): UploadResult {
    return {
      data: [],
      errors: [],
    };
  },

  error(errors: string | string[]): UploadResult {
    return {
      data: [],
      errors: Array.isArray(errors) ? errors : [errors],
    };
  },

  success(data: Array<unknown>): UploadResult {
    return {
      data: data,
      errors: [],
    };
  },
};

const LARGE_FILE_THRESHOLD = 20 * 1024 * 1024; // 20MB

const DEFAULT_READ_TOKEN_RESULT = Result.success({
  token: null,
  containerName: "",
  isPrivate: false,
  hostName: "",
  expiresOn: new Date(),
  generatedAt: new Date(),
});

const DEFAULT_READ_TOKEN_PROMISE = Promise.resolve(DEFAULT_READ_TOKEN_RESULT);

const uploadToBlob = async (
  props: UploadFilesToBlobProps,
): Promise<UploadResult> => {
  const { files, formId, submissionId, surveyModel, onSubmissionIdChange } =
    props;

  if (files.length === 0) {
    return UploadResult.empty();
  }

  try {
    const sasResponse = await fetch("/api/public/v0/storage/sas-token", {
      method: "POST",
      body: JSON.stringify({
        fileNames: files.map((f) => f.name),
        submissionId,
        formId,
        formLocale: surveyModel?.locale ?? "",
      }),
    });

    const sasData = await sasResponse.json();
    if (!sasResponse.ok) {
      throw new Error(sasData.error || "Failed to generate upload URLs");
    }

    if (sasData.submissionId && sasData.submissionId !== submissionId) {
      onSubmissionIdChange?.(sasData.submissionId);
    }

    const uploadPromises = files.map(async (file) => {
      const sasResult = sasData.sasTokens[file.name];

      if (!sasResult?.success) {
        return {
          success: false,
          error: sasResult?.message || `No upload URL for file: ${file.name}`,
        };
      }

      try {
        const blockBlobClient = new BlockBlobClient(sasResult.url);
        await blockBlobClient.uploadData(await file.arrayBuffer(), {
          onProgress: (progress) => {
            if (!progress?.loadedBytes || !file.size) {
              return;
            }
            const uploadProgress = Math.round(
              (progress.loadedBytes / file.size) * 100,
            );
            console.debug(`progress ${file.name}: ${uploadProgress}%`);
          },
        });

        const [url] = sasResult.url.split("?");

        return {
          success: true,
          data: {
            file: file,
            content: url,
          },
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        return {
          success: false,
          error: `Could not upload file: ${file.name}. ${errorMessage}`,
        };
      }
    });

    const uploadResults = await Promise.all(uploadPromises);
    const results = uploadResults.reduce((groupResults, curr) => {
      if (curr.success) {
        groupResults.data.push(curr.data);
      } else {
        groupResults.errors.push(curr.error);
      }
      return groupResults;
    }, UploadResult.empty());

    return results;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Upload failed";
    return UploadResult.error(errorMessage);
  }
};

const uploadToServer = async (
  props: UploadFilesToServerProps,
): Promise<UploadResult> => {
  const { files, formId, submissionId, surveyModel, onSubmissionIdChange } =
    props;

  if (files.length === 0) {
    return UploadResult.empty();
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append(file.name, file);
  });

  try {
    const response = await fetch("/api/public/v0/storage/upload", {
      method: "POST",
      body: formData,
      headers: {
        "edx-form-id": formId,
        "edx-submission-id": submissionId,
        "edx-form-lang": surveyModel?.locale ?? "",
      } as HeadersInit,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ??
        "Failed to upload files. Please refresh your page and try again.",
      );
    }

    if (data.submissionId && data.submissionId !== submissionId) {
      onSubmissionIdChange?.(data.submissionId);
    }

    const uploadedFiles = files.map((file) => {
      const remoteFile = data.files?.find(
        (uploadedFile: UploadedFile) => uploadedFile.name === file.name,
      );
      return {
        file: file,
        content: remoteFile?.url,
        token: remoteFile?.token,
      };
    });

    return UploadResult.success(uploadedFiles);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Upload failed";
    return UploadResult.error(errorMessage);
  }
};

/**
 * Hook to upload files to storage.
 * @param formId - The form ID.
 * @param submissionId - The submission ID.
 * @param onSubmissionIdChange - The function to call when the submission ID changes.
 * @param surveyModel - The survey model.
 * @param readTokenPromises - The read token promises.
 * @returns The registerStorageHandlers function.
 */
export function useStorageUpload({
  formId,
  submissionId = "",
  onSubmissionIdChange,
  surveyModel,
  readTokenPromises: propsReadTokenPromises,
}: UseStorageUploadProps) {
  const { tokens: contextTokens } = useAssetStorage();
  const readTokenPromises = propsReadTokenPromises ?? contextTokens;

  const userFilesTokenResult = use(
    readTokenPromises?.userFiles ?? DEFAULT_READ_TOKEN_PROMISE,
  );
  /**
   * Groups files by upload strategy.
   * Images below LARGE_FILE_THRESHOLD are flagged for resize;
   * all others are for direct upload.
   *
   * @param files Array of files to categorize
   * @returns Object with filesForUpload and filesForResize arrays
   */
  const groupFilesByUploadStrategy = useMemo(
    () =>
      (files: File[]): { filesForUpload: File[]; filesForResize: File[] } => {
        return files.reduce(
          (acc, file) => {
            if (
              file.type.startsWith("image/") &&
              file.size < LARGE_FILE_THRESHOLD
            ) {
              acc.filesForResize.push(file);
            } else {
              acc.filesForUpload.push(file);
            }
            return acc;
          },
          { filesForUpload: [] as File[], filesForResize: [] as File[] },
        );
      },
    [],
  );

  const onUploadFiles = useCallback(
    async (sender: SurveyModel, options: UploadFilesEvent) => {
      try {
        const { filesForUpload, filesForResize } = groupFilesByUploadStrategy(
          options.files,
        );

        const allResults = [];
        const allErrors = [];

        const blobResults = await uploadToBlob({
          files: filesForUpload,
          options,
          formId,
          submissionId,
          surveyModel,
          onSubmissionIdChange,
        });
        allResults.push(...blobResults.data);
        allErrors.push(...blobResults.errors);

        const serverResults = await uploadToServer({
          files: filesForResize,
          formId,
          submissionId,
          surveyModel,
          onSubmissionIdChange,
        });
        allResults.push(...serverResults.data);
        allErrors.push(...serverResults.errors);

        options.callback(allResults, allErrors);
      } catch (error) {
        const errors =
          error instanceof Error ? [error.message] : ["Upload failed"];
        options.callback(UploadResult.error(errors));
      }
    },
    [
      formId,
      groupFilesByUploadStrategy,
      onSubmissionIdChange,
      submissionId,
      surveyModel,
    ],
  );

  const onClearFiles = useCallback(
    async (sender: SurveyModel, options: ClearFilesEvent) => {
      try {
        if (options.question?.storeDataAsText) {
          return options.callback("success");
        }

        if (!options.value || options.value.length === 0) {
          return options.callback("success");
        }

        const filesToDelete = options.fileName
          ? options.value.filter((file: File) => file.name === options.fileName)
          : options.value;

        if (filesToDelete.length === 0) {
          console.error(`File with name ${options.fileName} is not found`);
          return options.callback("error");
        }

        const fileUrls = filesToDelete.map(
          (file: { content: string }) => file.content,
        );

        console.log(`Deleting ${fileUrls.length} files:`, fileUrls);

        const deleteResponse = await fetch("/api/public/v0/storage/delete", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            formId,
            submissionId,
            fileUrls,
          }),
        });

        const responseData = await deleteResponse.json();

        if (!deleteResponse.ok) {
          console.error("Delete API error:", responseData.error);
          return options.callback("error");
        }

        const successfulDeletions: Array<{ content: string }> = [];
        const failedDeletions: string[] = [];

        responseData.results.forEach(
          (result: { fileUrl: string; result: string; error?: string }) => {
            if (result.result === "success") {
              successfulDeletions.push({ content: result.fileUrl });
            } else {
              console.error(
                `Failed to delete file ${result.fileUrl}:`,
                result.error,
              );
              failedDeletions.push(result.error || "Unknown error");
            }
          },
        );

        if (successfulDeletions.length > 0) {
          options.callback("success", successfulDeletions);
        }

        if (failedDeletions.length > 0) {
          options.callback("error", failedDeletions.join("; "));
        }
      } catch (error) {
        console.error("Error in deleteFiles:", error);
        return options.callback("error");
      }
    },
    [formId, submissionId],
  );

  const onDownloadFile = useCallback(
    async (_: SurveyModel, options: DownloadFileEvent) => {
      const userFilesToken = Result.isSuccess(userFilesTokenResult)
        ? userFilesTokenResult.value.token
        : "";

      const url = userFilesToken
        ? `${options.content}?${userFilesToken}`
        : options.content;

      fetch(url)
        .then((response) => response.blob())
        .then((blob) => {
          const file = new File([blob], options.fileValue.name, {
            type: options.fileValue.type,
          });
          const reader = new FileReader();
          reader.onload = (e) => {
            options.callback("success", e?.target?.result ?? "");
          };
          reader.readAsDataURL(file);
        })
        .catch((error) => {
          console.error("Error: ", error);
          options.callback("error");
        });
    },
    [userFilesTokenResult],
  );

  const registerUploadHandlers = useCallback(
    (model: SurveyModel) => {
      model.onUploadFiles.add(onUploadFiles);
      model.onClearFiles.add(onClearFiles);
      model.onDownloadFile.add(onDownloadFile);

      return () => {
        model.onUploadFiles.remove(onUploadFiles);
        model.onClearFiles.remove(onClearFiles);
        model.onDownloadFile.remove(onDownloadFile);
      };
    },
    [onUploadFiles, onClearFiles, onDownloadFile],
  );

  return {
    registerUploadHandlers,
    uploadFiles: onUploadFiles,
    deleteFiles: onClearFiles,
  };
}
