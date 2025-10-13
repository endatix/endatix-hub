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

export function useBlobStorage({
  formId,
  submissionId = "",
  onSubmissionIdChange,
  surveyModel,
}: UseBlobStorageProps) {
  const uploadFiles = useCallback(
    async (sender: SurveyModel, options: UploadFilesEvent) => {
      try {
        const formData = new FormData();
        options.files.forEach((file) => {
          formData.append(file.name, file);
        });

        options.files.forEach(async (file) => {
          const sasTokenResponse = await fetch(
            "/api/public/v0/storage/sas-token",
            {
              method: "POST",
              body: JSON.stringify({
                fileName: file.name,
                submissionId: submissionId,
                formId: formId,
                formLocale: surveyModel?.locale ?? "",
              }),
            },
          );

          const data = await sasTokenResponse.json();
          if (!sasTokenResponse.ok) {
            throw new Error(data?.error ?? "Failed to generate SAS token");
          }

          if (data.submissionId && data.submissionId !== submissionId) {
            onSubmissionIdChange?.(data.submissionId);
          }

          const blockBlobClient = new BlockBlobClient(data.sasToken);
          const uploadResult = await blockBlobClient.uploadData(
            await file.arrayBuffer(),
            {
              blockSize: 4 * 1024 * 1024,
              concurrency: 2,
              onProgress: (progress) => {
                console.log("progress", progress);
              },
            },
          );

          options.callback([
            { file: file, content: data.sasToken.split("?")[0] },
          ]);
        });

        if (false) {
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
        }
      } catch (error) {
        console.error("Error: ", error);
        options.callback([], [error instanceof Error ? error.message : ""]);
      }
    },
    [formId, submissionId, surveyModel?.locale, onSubmissionIdChange],
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

const convertStringToArrayBuffer = (str: string) => {
  const textEncoder = new TextEncoder();
  return textEncoder.encode(str).buffer;
};

const convertFileToArrayBuffer = async (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    if (!file || !file.name) {
      reject(new Error("Invalid or missing file."));
    }

    const reader = new FileReader();

    reader.onload = () => {
      const arrayBuffer: ArrayBuffer | null | string = reader.result;

      if (arrayBuffer === null) {
        resolve(null);
        return;
      }
      if (typeof arrayBuffer === "string") {
        resolve(convertStringToArrayBuffer(arrayBuffer));
        return;
      }
      if (!arrayBuffer) {
        reject(new Error("Failed to read file into ArrayBuffer."));
        return;
      }

      resolve(arrayBuffer);
    };

    reader.onerror = () => {
      reject(new Error("Error reading file."));
    };

    reader.readAsArrayBuffer(file);
  });
};
