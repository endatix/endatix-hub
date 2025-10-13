import { useCallback, useEffect } from "react";
import { SurveyModel, UploadFilesEvent } from "survey-core";
import { BlockBlobClient } from "@azure/storage-blob";

interface UseBlobStorageProps {
  formId: string;
  submissionId?: string;
  surveyModel: SurveyModel | null;
  onSubmissionIdChange?: (newSubmissionId: string) => void;
}

interface UploadedFile {
  name: string;
  url: string;
}

const LARGE_FILE_THRESHOLD = 20 * 1024 * 1024; // 20MB

export function useBlobStorage({
  formId,
  submissionId = "",
  onSubmissionIdChange,
  surveyModel,
}: UseBlobStorageProps) {
  const uploadToBlob = useCallback(
    async (files: File[], options: UploadFilesEvent) => {
      if (files.length === 0) {
        return;
      }

      const sasTokenResponse = await fetch("/api/public/v0/storage/sas-token", {
        method: "POST",
        body: JSON.stringify({
          fileNames: options.files.map((file) => file.name),
          submissionId: submissionId,
          formId: formId,
          formLocale: surveyModel?.locale ?? "",
        }),
      });

      const data = await sasTokenResponse.json();
      if (!sasTokenResponse.ok) {
        throw new Error(data?.error ?? "Failed to generate SAS token");
      }

      if (data.submissionId && data.submissionId !== submissionId) {
        onSubmissionIdChange?.(data.submissionId);
      }

      const fileUploadJobs: Record<string, string> = data.sasTokens;
      options.files.forEach(async (file) => {
        const sasToken = fileUploadJobs[file.name];
        const blockBlobClient = new BlockBlobClient(sasToken);
        const uploadResult = await blockBlobClient.uploadData(
          await file.arrayBuffer(),
          {
            onProgress: (progress) => {
              const uploadProgress = Math.round(
                (progress.loadedBytes / file.size) * 100,
              );
              console.log(`progress ${file.name}: ${uploadProgress}%`);
            },
          },
        );

        options.callback([{ file: file, content: sasToken.split("?")[0] }]);
      });
    },
    [formId, submissionId, surveyModel?.locale, onSubmissionIdChange],
  );

  const uploadToServer = useCallback(
    async (files: File[], options: UploadFilesEvent) => {
      if (files.length === 0) {
        return;
      }

      const formData = new FormData();
      files.forEach((file) => {
        formData.append(file.name, file);
      });

      const response = await fetch("/api/public/v0/storage/upload", {
        method: "POST",
        body: formData,
        headers: {
          "edx-form-id": formId,
          "edx-submission-id": submissionId,
          "edx-form-lang": surveyModel?.locale ?? "",
        },
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

      const uploadedFiles = options.files.map((file) => {
        const remoteFile = data.files?.find(
          (uploadedFile: UploadedFile) => uploadedFile.name === file.name,
        );
        return {
          file: file,
          content: remoteFile?.url,
        };
      });

      options.callback(uploadedFiles);
    },
    [formId, submissionId, surveyModel?.locale, onSubmissionIdChange],
  );

  const uploadFiles = useCallback(
    async (sender: SurveyModel, options: UploadFilesEvent) => {
      const filesForUpload: File[] = [];
      const filesForResize: File[] = [];
      options.files.forEach((file) => {
        if (
          file.type.startsWith("image/") ||
          file.size < LARGE_FILE_THRESHOLD
        ) {
          filesForResize.push(file);
        } else {
          filesForUpload.push(file);
        }
      });

      try {
        await uploadToBlob(filesForUpload, options);
        await uploadToServer(filesForResize, options);
      } catch (error) {
        console.error("Error: ", error);
        options.callback([], [error instanceof Error ? error.message : ""]);
      }
    },
    [uploadToBlob, uploadToServer],
  );

  useEffect(() => {
    if (surveyModel) {
      surveyModel.onUploadFiles.add(uploadFiles);
      return () => {
        surveyModel.onUploadFiles.remove(uploadFiles);
      };
    }
  }, [surveyModel, uploadFiles]);

  return { uploadFiles };
}
