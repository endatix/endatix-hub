"use client";

import { useCallback, useState } from "react";
import { SurveyCreatorModel } from "survey-creator-core";
import { ReadTokensResult } from "../types";
import { useContentUpload } from "../use-cases/upload-content-files/use-content-upload.hook";
import { useCreatorView } from "../use-cases/view-protected-files/use-creator-view.hook";
import { useStorageConfig } from "../infrastructure";

interface UseCreatorStorageProps {
  itemId: string;
  itemType: "form" | "template";
  readTokenPromises?: {
    userFiles: Promise<ReadTokensResult>;
    content: Promise<ReadTokensResult>;
  };
}

/**
 * Hook to provide storage feature activation for SurveyJS Creator.
 * @returns {Object} { registerStorageHandlers, isStorageReady } - Function to register all storage event handlers and readiness flag.
 */
export function useCreatorStorage({
  itemId,
  itemType,
  readTokenPromises,
}: UseCreatorStorageProps) {
  const [isStorageReady, setIsStorageReady] = useState(false);
  const storageConfig = useStorageConfig();

  const { registerUploadHandlers } = useContentUpload({ itemId, itemType });
  const { registerViewHandlers } = useCreatorView({ readTokenPromises });

  /**
   * Registers all storage-related handlers (upload and view) to the provided creator.
   * @param creator The creator instance to register handlers on.
   * @returns A cleanup function to unregister all handlers.
   */
  const registerStorageHandlers = useCallback(
    (creator: SurveyCreatorModel) => {
      // If storage is disabled, we consider storage "ready" immediately
      if (!storageConfig?.isEnabled) {
        setIsStorageReady(true);
        return () => {};
      }

      const unregisterUpload = registerUploadHandlers(creator);
      const unregisterView = registerViewHandlers(creator);

      setIsStorageReady(true);

      return () => {
        setIsStorageReady(false);
        unregisterUpload?.();
        unregisterView?.();
      };
    },
    [storageConfig?.isEnabled, registerUploadHandlers, registerViewHandlers],
  );

  return { registerStorageHandlers, isStorageReady };
}
