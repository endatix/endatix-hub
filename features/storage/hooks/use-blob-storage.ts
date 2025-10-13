import { useCallback, useEffect, useMemo } from "react";
import { SurveyModel, UploadFilesEvent } from "survey-core";
import { BlockBlobClient } from "@azure/storage-blob";

interface UseBlobStorageProps {
  formId: string;
  submissionId?: string;
  surveyModel: SurveyModel | null;
  onSubmissionIdChange?: (newSubmissionId: string) => void;
}

interface UploadFilesToBlobProps extends UseBlobStorageProps {
  files: File[];
  options: UploadFilesEvent;
}

interface UploadFilesToServerProps extends UseBlobStorageProps {
  files: File[];
}

interface UploadedFile {
  name: string;
  url: string;
}

interface UploadResult {
  data: any | Array<any>;
  errors: any | Array<any>;
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

  success(data: any | Array<any>): UploadResult {
    return {
      data: data,
      errors: [],
    };
  },
};

const LARGE_FILE_THRESHOLD = 20 * 1024 * 1024; // 20MB

const uploadToBlob = async (
  props: UploadFilesToBlobProps,
): Promise<UploadResult> => {
  const {
    files,
    options,
    formId,
    submissionId,
    surveyModel,
    onSubmissionIdChange,
  } = props;
  if (files.length === 0) {
    return UploadResult.empty();
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
      throw new Error(sasData.error || "Failed to generate upload URLs");
    }

    if (sasData.submissionId && sasData.submissionId !== submissionId) {
      onSubmissionIdChange?.(sasData.submissionId);
    }

    const uploadFilesResult: UploadResult = {
      data: [],
      errors: [],
    };

    const uploadFilePromises = files.map(async (file) => {
      const sasToken = sasData.sasTokens[file.name];

      if (!sasToken) {
        uploadFilesResult.errors.push(`Not expected file name: ${file.name}.`);
        return;
      }

      if (!sasToken.success) {
        uploadFilesResult.errors.push(sasToken.message);
        return;
      }

      const blockBlobClient = new BlockBlobClient(sasToken.url);
      try {
        const fileBuffer = await file.arrayBuffer();

        await blockBlobClient.uploadData(fileBuffer, {
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
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        uploadFilesResult.errors.push(
          `Could not upload file: ${file.name}. ${errorMessage}`,
        );
        return;
      }

      uploadFilesResult.data.push({
        file: file,
        content: sasToken.url.split("?")[0],
      });
    });

    await Promise.all(uploadFilePromises);

    return uploadFilesResult;
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
      };
    });

    return UploadResult.success(uploadedFiles);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Upload failed";
    return UploadResult.error(errorMessage);
  }
};

export function useBlobStorage({
  formId,
  submissionId = "",
  onSubmissionIdChange,
  surveyModel,
}: UseBlobStorageProps) {
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

  const uploadFiles = useCallback(
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
