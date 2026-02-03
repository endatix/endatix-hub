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
import { buildUserFileMetadata } from "../../infrastructure/storage-utils";
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

/** Pre-fetched SAS response from POST /api/public/v0/storage/sas-token (or error body). */
interface SasTokenData {
  sasTokens: Record<
    string,
    { success: boolean; url?: string; message?: string }
  >;
  submissionId?: string;
  error?: string;
  detail?: string;
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
  preFetchedSas?: SasTokenData,
): Promise<UploadResult> => {
  const {
    files,
    formId,
    submissionId,
    surveyModel,
    onSubmissionIdChange,
    options,
  } = props;

  if (files.length === 0) {
    return UploadResult.empty();
  }

  try {
    let sasData: SasTokenData;
    if (preFetchedSas) {
      sasData = preFetchedSas;
    } else {
      const sasResponse = await fetch("/api/public/v0/storage/sas-token", {
        method: "POST",
        body: JSON.stringify({
          fileNames: files.map((f) => f.name),
          submissionId,
          formId,
          formLocale: surveyModel?.locale ?? "",
        }),
      });
      sasData = await sasResponse.json();
      if (!sasResponse.ok) {
        throw new Error(
          sasData.error ?? sasData.detail ?? "Failed to generate upload URLs",
        );
      }
      if (sasData.submissionId && sasData.submissionId !== submissionId) {
        onSubmissionIdChange?.(sasData.submissionId);
      }
    }

    const uploadPromises = files.map(async (file) => {
      const sasResult = sasData.sasTokens[file.name];

      if (!sasResult?.success || !sasResult?.url) {
        return {
          success: false,
          error: sasResult?.message ?? `No upload URL for file: ${file.name}`,
        };
      }

      const sasUrl = sasResult.url;
      try {
        const blockBlobClient = new BlockBlobClient(sasUrl);
        const metadataOptions = buildUserFileMetadata({
          formId,
          submissionId: submissionId ?? "",
          questionId: options.question?.name ?? "",
          formLang: surveyModel?.locale ?? "",
          fileName: file.name,
          fileType: file.type,
          fileState: "original",
        });
        const headerOptions = {
          blobContentType: metadataOptions.fileType,
          blobContentLanguage: metadataOptions.formLang,
          blobContentDisposition: metadataOptions.fileContentDisposition,
        };
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
          metadata: {
            ...metadataOptions,
          },
          blobHTTPHeaders: headerOptions,
        });

        const [url] = sasUrl.split("?");

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
        groupResults.errors.push(curr.error ?? "Upload failed");
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

interface UploadResizedToBlobProps extends UseStorageUploadProps {
  files: File[];
  options: UploadFilesEvent;
  sasData: SasTokenData;
}

/** Resize images via dedicated route, then upload resized bytes to SAS URL (browser-to-storage). */
const uploadResizedToBlob = async (
  props: UploadResizedToBlobProps,
): Promise<UploadResult> => {
  const {
    files,
    formId,
    submissionId,
    surveyModel,
    onSubmissionIdChange,
    options,
    sasData,
  } = props;

  if (files.length === 0) {
    return UploadResult.empty();
  }

  if (sasData.submissionId && sasData.submissionId !== (submissionId ?? "")) {
    onSubmissionIdChange?.(sasData.submissionId);
  }

  const uploadPromises = files.map(async (file) => {
    const sasResult = sasData.sasTokens[file.name];
    if (!sasResult?.success) {
      return {
        success: false as const,
        error: sasResult?.message ?? `No upload URL for file: ${file.name}`,
      };
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      const resizeResponse = await fetch(
        "/api/public/v0/storage/resize-image",
        {
          method: "POST",
          body: formData,
        },
      );
      if (!resizeResponse.ok) {
        const errData = await resizeResponse.json().catch(() => ({}));
        throw new Error(errData.error ?? "Resize failed");
      }
      const resizedBuffer = await resizeResponse.arrayBuffer();
      const contentType =
        resizeResponse.headers.get("Content-Type") ?? file.type;

      const metadataOptions = buildUserFileMetadata({
        formId,
        submissionId: sasData.submissionId ?? submissionId ?? "",
        questionId: options.question?.name ?? "",
        formLang: surveyModel?.locale ?? "",
        fileName: file.name,
        fileType: contentType,
        fileState: "optimized",
      });
      const resizeSasUrl = sasResult.url;
      if (!resizeSasUrl) {
        return {
          success: false as const,
          error: `No upload URL for file: ${file.name}`,
        };
      }

      const blockBlobClient = new BlockBlobClient(resizeSasUrl);
      const uploadMetadata: Record<string, string> = {
        formId: metadataOptions.formId,
        submissionId: metadataOptions.submissionId,
        fileName: metadataOptions.fileName,
        fileType: metadataOptions.fileType,
        questionId: metadataOptions.questionId,
        formLang: metadataOptions.formLang ?? "",
        fileContentDisposition:
          metadataOptions.fileContentDisposition ?? "inline",
      };
      if (metadataOptions.fileState !== undefined) {
        uploadMetadata.fileState = metadataOptions.fileState;
      }
      await blockBlobClient.uploadData(resizedBuffer, {
        metadata: uploadMetadata,
        blobHTTPHeaders: {
          blobContentType: metadataOptions.fileType,
          blobContentLanguage: metadataOptions.formLang ?? "",
          blobContentDisposition:
            metadataOptions.fileContentDisposition ?? "inline",
        },
      });

      const [url] = resizeSasUrl.split("?");
      return {
        success: true as const,
        data: { file, content: url },
      };
    } catch {
      // On resize failure, upload original image to the same SAS URL (graceful fallback)
      const fallbackSasUrl = sasResult.url;
      if (!fallbackSasUrl) {
        return {
          success: false as const,
          error: `No upload URL for file: ${file.name}`,
        };
      }
      try {
        const metadataOptions = buildUserFileMetadata({
          formId,
          submissionId: sasData.submissionId ?? submissionId ?? "",
          questionId: options.question?.name ?? "",
          formLang: surveyModel?.locale ?? "",
          fileName: file.name,
          fileType: file.type,
          fileState: "original",
        });
        const blockBlobClient = new BlockBlobClient(fallbackSasUrl);
        const fallbackMetadata: Record<string, string> = {
          formId: metadataOptions.formId,
          submissionId: metadataOptions.submissionId,
          fileName: metadataOptions.fileName,
          fileType: metadataOptions.fileType,
          questionId: metadataOptions.questionId,
          formLang: metadataOptions.formLang ?? "",
          fileContentDisposition:
            metadataOptions.fileContentDisposition ?? "inline",
        };
        if (metadataOptions.fileState !== undefined) {
          fallbackMetadata.fileState = metadataOptions.fileState as string;
        }
        await blockBlobClient.uploadData(await file.arrayBuffer(), {
          metadata: fallbackMetadata,
          blobHTTPHeaders: {
            blobContentType: metadataOptions.fileType,
            blobContentLanguage: metadataOptions.formLang ?? "",
            blobContentDisposition:
              metadataOptions.fileContentDisposition ?? "inline",
          },
        });
        const [url] = fallbackSasUrl.split("?");
        return {
          success: true as const,
          data: { file, content: url },
        };
      } catch (fallbackError) {
        const errorMessage =
          fallbackError instanceof Error
            ? fallbackError.message
            : "Upload failed";
        return {
          success: false as const,
          error: `Could not upload file: ${file.name}. ${errorMessage}`,
        };
      }
    }
  });

  const uploadResults = await Promise.all(uploadPromises);
  return uploadResults.reduce((acc, curr) => {
    if (curr.success) {
      acc.data.push(curr.data);
    } else {
      acc.errors.push(curr.error);
    }
    return acc;
  }, UploadResult.empty());
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
  const { config: storageConfig, tokens: contextTokens } = useAssetStorage();
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
        if (!storageConfig?.imageConfig?.isResizeEnabled) {
          return {
            filesForUpload: files,
            filesForResize: [],
          };
        }

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
    [storageConfig],
  );

  const onUploadFiles = useCallback(
    async (_sender: SurveyModel, options: UploadFilesEvent) => {
      try {
        const { filesForUpload, filesForResize } = groupFilesByUploadStrategy(
          options.files,
        );

        const allFileNames = options.files.map((f) => f.name);
        if (allFileNames.length === 0) {
          options.callback([], []);
          return;
        }

        const sasResponse = await fetch("/api/public/v0/storage/sas-token", {
          method: "POST",
          body: JSON.stringify({
            fileNames: allFileNames,
            submissionId,
            formId,
            formLocale: surveyModel?.locale ?? "",
          }),
        });
        const sasData: SasTokenData = await sasResponse.json();
        if (!sasResponse.ok) {
          options.callback(
            [],
            [
              sasData.error ??
                sasData.detail ??
                "Failed to generate upload URLs",
            ],
          );
          return;
        }
        if (sasData.submissionId && sasData.submissionId !== submissionId) {
          onSubmissionIdChange?.(sasData.submissionId);
        }

        const blobProps = {
          formId,
          submissionId,
          surveyModel,
          onSubmissionIdChange,
          options,
        };

        const blobResults = await uploadToBlob(
          { ...blobProps, files: filesForUpload },
          sasData,
        );
        const resizeResults = await uploadResizedToBlob({
          ...blobProps,
          files: filesForResize,
          sasData,
        });

        options.callback(
          [...blobResults.data, ...resizeResults.data],
          [...blobResults.errors, ...resizeResults.errors],
        );
      } catch (error) {
        const errors: string[] =
          error instanceof Error ? [error.message] : ["Upload failed"];
        options.callback([], errors);
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
    async (_: SurveyModel, options: ClearFilesEvent) => {
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

        console.debug(`Deleting ${fileUrls.length} files:`, fileUrls);

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
