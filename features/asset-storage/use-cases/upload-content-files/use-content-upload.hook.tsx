"use client";

import { Result } from "@/lib/result";
import { useCallback, useState } from "react";
import { SurveyCreatorModel, UploadFileEvent } from "survey-creator-core";
import { ContentItemType } from "../../types";
import { useAssetStorage } from "../../ui/asset-storage.context";
import { uploadContentFileAction } from "./upload-content-file.action";

interface UseContentUploadProps {
  itemId: string;
  itemType: ContentItemType;
}

/**
 * Hook to handle content file uploads in SurveyJS Creator.
 * Provides a handler for the onUploadFile event. Enabled only if storage is enabled.
 */
export function useContentUpload({ itemId, itemType }: UseContentUploadProps) {
  const [isStorageReady, setIsStorageReady] = useState(false);
  const { config: storageConfig } = useAssetStorage();

  const onUploadFile = useCallback(
    async (_sender: SurveyCreatorModel, options: UploadFileEvent) => {
      const formData = new FormData();
      formData.append("itemId", itemId);
      formData.append("itemType", itemType);

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
    [itemId, itemType],
  );

  /**
   * Registers the upload handler to the SurveyJS Creator instance.
   * @param creator The SurveyCreatorModel instance.
   * @returns A cleanup function to unregister the handler.
   */
  const registerUploadHandlers = useCallback(
    (creator: SurveyCreatorModel) => {
      if (!storageConfig?.isEnabled) {
        setIsStorageReady(true);
        return () => {};
      }

      creator.onUploadFile.add(onUploadFile);
      setIsStorageReady(true);

      return () => {
        setIsStorageReady(false);
        creator.onUploadFile.remove(onUploadFile);
      };
    },
    [storageConfig?.isEnabled, onUploadFile],
  );

  return {
    registerUploadHandlers,
    isStorageReady,
  };
}
