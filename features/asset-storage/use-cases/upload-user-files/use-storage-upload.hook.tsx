"use client";

import { use, useCallback, useMemo } from "react";
import { ClearFilesEvent, DownloadFileEvent, SurveyModel } from "survey-core";
import { Result } from "@/lib/result";
import {
  AssetStorageTokens,
  useAssetStorage,
} from "../../ui/asset-storage.context";
import { createUserUpload } from "../upload/upload-handler.factory";

interface UseStorageUploadProps {
  formId: string;
  submissionId?: string;
  surveyModel: SurveyModel | null;
  onSubmissionIdChange?: (newSubmissionId: string) => void;
  readTokenPromises?: AssetStorageTokens;
}

const DEFAULT_READ_TOKEN_RESULT = Result.success({
  token: null,
  containerName: "",
  isPrivate: false,
  hostName: "",
  expiresOn: new Date(),
  generatedAt: new Date(),
});

const DEFAULT_READ_TOKEN_PROMISE = Promise.resolve(DEFAULT_READ_TOKEN_RESULT);

/**
 * Hook to upload files to storage.
 * Uses upload-handler factory for SAS/resize URLs and upload flow.
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

  const onUploadFiles = useMemo(() => {
    return createUserUpload({
      formId,
      submissionId,
      surveyModel,
      onSubmissionIdChange,
      isResizeEnabled: Boolean(storageConfig?.imageConfig?.isResizeEnabled),
    });
  }, [
    formId,
    submissionId,
    surveyModel,
    onSubmissionIdChange,
    storageConfig?.imageConfig?.isResizeEnabled,
  ]);

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
        options.callback("error");
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
