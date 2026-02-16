"use client";

import { useCallback, useState } from "react";
import { SurveyCreatorModel, UploadFileEvent } from "survey-creator-core";
import { Base, Question, SurveyModel } from "survey-core";
import type { ContentItemType } from "../../types";
import { useAssetStorage } from "../../ui/asset-storage.context";
import { createContentUpload } from "../upload/upload-handler.factory";

interface UseContentUploadProps {
  itemId: string;
  itemType: ContentItemType;
}

const NA_VALUE = "N/A";
const NAME_PROPERTY = "name";
const SURVEY_TYPE = "propertyName";

export function resolveQuestionName(options: UploadFileEvent): string {
  const { element, elementType } = options;

  if (!element || !elementType) return NA_VALUE;

  if (elementType === SURVEY_TYPE) {
    return options.propertyName?.toString() ?? NA_VALUE;
  }

  if (
    NAME_PROPERTY in element &&
    typeof element.name === "string" &&
    element.name
  ) {
    return element.name;
  }

  if (element instanceof Base) {
    const name = element.getPropertyValue
      ? element.getPropertyValue(NAME_PROPERTY)
      : null;
    return (name as string) || element.uniqueId?.toString() || NA_VALUE;
  }

  return NA_VALUE;
}

/**
 * Hook to handle content file uploads in SurveyJS Creator. Enabled only if storage is enabled.
 * Uses upload-handler factory for SAS/resize URLs and upload flow.
 */
export function useContentUpload({ itemId, itemType }: UseContentUploadProps) {
  const [isStorageReady, setIsStorageReady] = useState(false);
  const { config: storageConfig } = useAssetStorage();

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
