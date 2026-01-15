"use client";

import { useEffect } from "react";
import { SurveyCreatorModel, SurveyInstanceCreatedEvent } from "survey-creator-core";
import { useStorageConfig } from "../../infrastructure/storage-config.context";
import { useContentUpload } from "../upload-files/use-content-upload.hook";
import { useStorageView } from "./use-storage-view.hook";
import { ReadTokensResult } from "../../types";

interface UseCreatorStorageProps {
  creator: SurveyCreatorModel | null;
  formId: string;
  readTokenPromises?: {
    userFiles: Promise<ReadTokensResult>;
    content: Promise<ReadTokensResult>;
  };
}

/**
 * Composite hook that activates all storage features for a SurveyCreator instance.
 * Handles both content uploads and private file viewing across all creator survey instances.
 */
export function useCreatorStorage({
  creator,
  formId,
  readTokenPromises,
}: UseCreatorStorageProps) {
  const storageConfig = useStorageConfig();
  const { onUploadFile } = useContentUpload({ formId });
  const { setModelMetadata, registerViewHandlers } = useStorageView(readTokenPromises);

  useEffect(() => {
    if (!creator || !storageConfig?.isEnabled) return;

    // 1. Handle file uploads (logos, images in questions)
    creator.onUploadFile.add(onUploadFile);

    // 2. Handle token injection for all survey instances (Designer, Preview, Property Grid)
    const handleSurveyInstanceCreated = (
      _: SurveyCreatorModel,
      options: SurveyInstanceCreatedEvent,
    ) => {
      // Always set metadata (synchronous flags)
      setModelMetadata(options.survey);

      // Register view handlers if storage is private
      if (storageConfig.isPrivate) {
        registerViewHandlers(options.survey);
      }
    };

    creator.onSurveyInstanceCreated.add(handleSurveyInstanceCreated);

    // Cleanup handlers on unmount or when creator changes
    return () => {
      creator.onUploadFile.remove(onUploadFile);
      creator.onSurveyInstanceCreated.remove(handleSurveyInstanceCreated);
    };
  }, [
    creator,
    storageConfig,
    onUploadFile,
    setModelMetadata,
    registerViewHandlers,
  ]);
}
