"use client";

import { useCallback, useState, useEffect } from "react";
import { SurveyCreatorModel } from "survey-creator-core";
import { useContentUpload } from "./use-content-upload.hook";
import { useCreatorView } from "../view-protected-files/use-creator-view.hook";
import {
  useAssetStorage,
  AssetStorageTokens,
} from "../../ui/asset-storage.context";
import { registerProtectedFilePreview } from "../view-protected-files/ui/protected-file-preview";

interface UseCreatorStorageProps {
  itemId: string;
  itemType: "form" | "template";
  readTokenPromises?: AssetStorageTokens;
}

/**
 * Hook to provide storage feature activation for SurveyJS Creator.
 * @returns {Object} { registerStorageHandlers, isStorageReady } - Function to register all storage event handlers and readiness flag.
 */
export function useCreatorStorage({
  itemId,
  itemType,
  readTokenPromises: propsReadTokenPromises,
}: UseCreatorStorageProps) {
  const { tokens: contextTokens, config: storageConfig } = useAssetStorage();
  const readTokenPromises = propsReadTokenPromises ?? contextTokens;

  const [isStorageReady, setIsStorageReady] = useState(false);

  const { registerUploadHandlers } = useContentUpload({ itemId, itemType });
  const { registerViewHandlers } = useCreatorView({ readTokenPromises });

  useEffect(() => {
    registerProtectedFilePreview();
  }, []);

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
        return () => { };
      }

      const unregisterUpload = registerUploadHandlers(creator);
      let unregisterView = () => { };

      if (storageConfig.isPrivate) {
        unregisterView = registerViewHandlers(creator);
      }

      setIsStorageReady(true);

      return () => {
        setIsStorageReady(false);
        unregisterUpload?.();
        unregisterView?.();
      };
    },
    [storageConfig?.isEnabled, storageConfig?.isPrivate, registerUploadHandlers, registerViewHandlers],
  );

  return { registerStorageHandlers, isStorageReady };
}
