"use client";

import { useCallback } from "react";
import { SurveyCreatorModel, UploadFileEvent } from "survey-creator-core";
import { uploadContentFileAction } from "./upload-content-file.action";
import { Result } from "@/lib/result";

interface UseContentUploadProps {
  formId: string;
}

/**
 * Hook to handle content file uploads in SurveyJS Creator.
 * Provides a handler for the onUploadFile event.
 */
export function useContentUpload({ formId }: UseContentUploadProps) {
  const onUploadFile = useCallback(
    async (_sender: SurveyCreatorModel, options: UploadFileEvent) => {
      const formData = new FormData();
      formData.append("formId", formId);

      options.files.forEach((file: File) => {
        formData.append("file", file);
      });

      try {
        const result = await uploadContentFileAction(formData);

        if (Result.isError(result)) {
          console.error("Upload failed:", result.message);
          options.callback("error", result.message ?? "Upload failed");
          return;
        }

        options.callback("success", result.value.url);
      } catch (error) {
        console.error("Error during upload:", error);
        options.callback(
          "error",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    },
    [formId],
  );

  return {
    onUploadFile,
  };
}
