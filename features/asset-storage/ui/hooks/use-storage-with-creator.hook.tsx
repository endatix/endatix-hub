"use client";

import { useCallback, useState, useEffect } from "react";
import { SurveyCreatorModel } from "survey-creator-core";
import { useContentUpload } from "../../use-cases/upload-content-files/use-content-upload.hook";
import { useAssetStorage, AssetStorageTokens } from "../asset-storage.context";
import { registerProtectedFilePreview } from "../../use-cases/view-protected-files/ui/protected-file-preview";
import { registerProtectedSignaturePad } from "../../use-cases/view-protected-files/ui/protected-singaturepad";
import { registerProtectedImageItem } from "../../use-cases/view-protected-files/ui/protected-image-item";
import { registerProtectedLogoImage } from "../../use-cases/view-protected-files/ui/protected-logo-image";
import { registerProtectedImages } from "../../use-cases/view-protected-files/ui/protected-image";

interface UseStorageWithCreatorProps {
  itemId: string;
  itemType: "form" | "template";
  readTokenPromises?: AssetStorageTokens;
}

/**
 * Orchestrator hook for storage functionality with SurveyCreatorModel.
 * Handles all storage-related event handlers (upload and view) for content type.
 * @returns {Object} { registerStorageHandlers, isStorageReady } - Function to register all storage event handlers and readiness flag.
 */
export function useStorageWithCreator({
  itemId,
  itemType,
}: UseStorageWithCreatorProps) {
  const { config: storageConfig } = useAssetStorage();

  const [isStorageReady, setIsStorageReady] = useState(false);

  const { registerUploadHandlers } = useContentUpload({ itemId, itemType });

  useEffect(() => {
    if (storageConfig?.isPrivate) {
      registerProtectedFilePreview();
      registerProtectedSignaturePad();
      registerProtectedImageItem();
      registerProtectedLogoImage();
      registerProtectedImages();
    }
  }, [storageConfig?.isPrivate]);

  /**
   * Registers all storage-related handlers (upload and view) to the provided creator.
   * @param creator The creator instance to register handlers on.
   * @returns A cleanup function to unregister all handlers.
   */
  const registerStorageHandlers = useCallback(
    (creator: SurveyCreatorModel) => {
      if (!storageConfig?.isEnabled) {
        setIsStorageReady(true);
        return () => {};
      }

      const unregisterUpload = registerUploadHandlers(creator);
      setIsStorageReady(true);

      return () => {
        setIsStorageReady(false);
        unregisterUpload?.();
      };
    },
    [storageConfig?.isEnabled, registerUploadHandlers],
  );

  return { registerStorageHandlers, isStorageReady };
}
