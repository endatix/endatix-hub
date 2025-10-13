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
  const uploadToBlob = async (files: File[], options: UploadFilesEvent) => {
    if (files.length === 0) {
      return;
    }

    const fileNames = files.map((file) => file.name);

    try {
      const sasResponse = await fetch("/api/public/v0/storage/sas-token", {
        method: "POST",
        body: JSON.stringify({
          fileNames,
          submissionId,
          formId,
          formLocale: surveyModel?.locale ?? "",
        }),
      });

      const sasData = await sasResponse.json();
      if (!sasResponse.ok) {
        throw new Error(sasData.error || "Failed to get upload URLs");
      }

      if (sasData.submissionId && sasData.submissionId !== submissionId) {
        onSubmissionIdChange?.(sasData.submissionId);
      }

      const uploadFilePromises = options.files.map(async (file) => {
        const sasToken = sasData.sasTokens[file.name];
        if (!sasToken) {
          throw new Error(`No upload URL for file: ${file.name}`);
        }

        const blockBlobClient = new BlockBlobClient(sasToken);
        const uploadResult = await blockBlobClient.uploadData(
          await file.arrayBuffer(),
          {
            onProgress: (progress) => {
              const uploadProgress = Math.round(
                (progress.loadedBytes / file.size) * 100,
              );
              console.debug(`progress ${file.name}: ${uploadProgress}%`);
            },
          },
        );

        console.log("Upload result: ", uploadResult);

        return {
          file: file,
          content: sasToken.split("?")[0],
        };
      });

      const uploadResults = await Promise.all(uploadFilePromises);
      options.callback(uploadResults);
    } catch (error) {
      console.error("Direct upload error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      console.error(
        `Upload failed for files: ${options.files
          .map((f) => f.name)
          .join(", ")}`,
      );
      options.callback([], [errorMessage]);
    }
  };

  const uploadToServer = async (files: File[], options: UploadFilesEvent) => {
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
  };

  const uploadFiles = useCallback(
    async (sender: SurveyModel, options: UploadFilesEvent) => {
      const filesForUpload: File[] = [];
      const filesForResize: File[] = [];
      options.files.forEach((file) => {
        if (
          file.type.startsWith("image/") &&
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
        options.callback(
          [],
          [error instanceof Error ? error.message : "Upload failed"],
        );
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
