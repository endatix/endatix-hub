"use client";

import { useCallback, useState } from "react";
import { SurveyCreatorModel, UploadFileEvent } from "survey-creator-core";
import { Base } from "survey-core";
import type { ContentItemType } from "../../types";
import { useAssetStorage } from "../../ui/asset-storage.context";
import { createContentUpload } from "../upload/upload-handler.factory";

interface UseContentUploadProps {
  itemId: string;
  itemType: ContentItemType;
}

/**
 * Hook to handle content file uploads in SurveyJS Creator. Enabled only if storage is enabled.
 * Uses upload-handler factory for SAS/resize URLs and upload flow.
 */
export function useContentUpload({ itemId, itemType }: UseContentUploadProps) {
  const [isStorageReady, setIsStorageReady] = useState(false);
  const { config: storageConfig } = useAssetStorage();

  const resolveQuestionName = useCallback(
    (options: UploadFileEvent): string => {
      const element = options.element;
      if (
        element &&
        element instanceof Base &&
        typeof element.getPropertyValue === "function"
      ) {
        return element.getPropertyValue("name") ?? element.uniqueId;
      }
      return "N/A";
    },
    [],
  );

  const wrappedOnUploadFile = useCallback(
    async (sender: SurveyCreatorModel, options: UploadFileEvent) => {
      const questionName = resolveQuestionName(options);
      const handler = createContentUpload({
        itemId,
        itemType,
        questionName,
        isResizeEnabled: Boolean(storageConfig?.imageConfig?.isResizeEnabled),
      });
      return handler(sender, options);
    },
    [
      itemId,
      itemType,
      resolveQuestionName,
      storageConfig?.imageConfig?.isResizeEnabled,
    ],
  );

  const registerUploadHandlers = useCallback(
    (creator: SurveyCreatorModel) => {
      if (!storageConfig?.isEnabled) {
        setIsStorageReady(true);
        return () => {};
      }

      creator.onUploadFile.add(wrappedOnUploadFile);
      setIsStorageReady(true);

      return () => {
        setIsStorageReady(false);
        creator.onUploadFile.remove(wrappedOnUploadFile);
      };
    },
    [storageConfig?.isEnabled, wrappedOnUploadFile],
  );

  return {
    registerUploadHandlers,
    isStorageReady,
  };
}
