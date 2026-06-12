"use client";

import { useCallback, useMemo } from "react";
import { ClearFilesEvent, DownloadFileEvent, SurveyModel } from "survey-core";
import type { StorageReadRuntime } from "../../infrastructure/storage-read-runtime";
import { pickStorageDeleteEndpoint } from "../../infrastructure/storage-api-policy";
import { buildPublicStorageGateBody } from "../../infrastructure/storage-read-request";
import { useAssetStorage } from "../../ui/asset-storage.context";
import { createUserUpload } from "../upload/upload-handler.factory";

function toClearedFileEntries(
  files: Array<{ content: string }>,
): Array<{ content: string }> {
  return files.map((file) => ({ content: file.content }));
}

interface UseStorageUploadProps {
  formId: string;
  surveyModel: SurveyModel | null;
  getSubmissionId?: () => string | undefined;
  onSubmissionIdChange?: (newSubmissionId: string) => void;
  getReadRuntime: () => StorageReadRuntime | null;
}

/**
 * Hook to upload files to storage.
 * Uses upload-handler factory for SAS/resize URLs and upload flow.
 */
export function useStorageUpload({
  formId,
  getSubmissionId,
  onSubmissionIdChange,
  surveyModel,
  getReadRuntime,
}: UseStorageUploadProps) {
  const {
    config: storageConfig,
    enqueuePrivateReadUrls,
    getCachedPrivateReadUrl,
  } = useAssetStorage();

  const onUploadFiles = useMemo(() => {
    return createUserUpload({
      formId,
      getSubmissionId,
      getReadRuntime,
      surveyModel,
      onSubmissionIdChange,
      isResizeEnabled: Boolean(storageConfig?.imageConfig?.isResizeEnabled),
    });
  }, [
    formId,
    getSubmissionId,
    surveyModel,
    onSubmissionIdChange,
    getReadRuntime,
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

        const runtime = getReadRuntime();
        const policyName = runtime?.policyName ?? "public";

        // Hub submission edit: detach files in the model only so Discard can restore URLs.
        // Blobs are not deleted until a dedicated save/purge flow exists.
        if (policyName === "hub") {
          options.callback("success", toClearedFileEntries(filesToDelete));
          return;
        }

        const fileUrls = filesToDelete.map(
          (file: { content: string }) => file.content,
        );

        console.debug(`Deleting ${fileUrls.length} files:`, fileUrls);

        const currentSubmissionId = getSubmissionId?.();
        const endpoint = pickStorageDeleteEndpoint(policyName);

        const deleteResponse = await fetch(endpoint, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...buildPublicStorageGateBody(
              { formId, submissionId: currentSubmissionId },
              runtime,
            ),
            fileUrls,
          }),
        });

        const responseData = (await deleteResponse.json()) as {
          detail?: string;
          error?: string;
          title?: string;
          results?: Array<{
            fileUrl: string;
            result: string;
            error?: string;
          }>;
        };

        if (!deleteResponse.ok) {
          const apiMessage =
            responseData.detail ??
            responseData.error ??
            responseData.title ??
            `HTTP ${deleteResponse.status}`;
          console.error("Delete API error:", apiMessage);
          return options.callback("error");
        }

        const successfulDeletions: Array<{ content: string }> = [];
        const failedDeletions: string[] = [];

        responseData.results?.forEach(
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
    [formId, getSubmissionId, getReadRuntime],
  );

  const onDownloadFile = useCallback(
    async (_: SurveyModel, options: DownloadFileEvent) => {
      let url = options.content;

      if (storageConfig?.isPrivate) {
        try {
          const cached = getCachedPrivateReadUrl(options.content);
          if (cached === null) {
            const runtime = getReadRuntime();
            const batch = await enqueuePrivateReadUrls(
              [options.content],
              runtime,
            );
            const presigned = batch.get(options.content);

            if (!presigned) {
              console.error("Failed to resolve read URL for download");
              options.callback("error");
              return;
            }

            url = presigned;
          } else {
            url = cached;
          }
        } catch (error) {
          console.error("Error getting read token:", error);
          options.callback("error");
          return;
        }
      }

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
    [
      storageConfig,
      getReadRuntime,
      enqueuePrivateReadUrls,
      getCachedPrivateReadUrl,
    ],
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
