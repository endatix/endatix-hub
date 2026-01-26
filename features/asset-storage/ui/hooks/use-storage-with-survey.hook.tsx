"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SurveyModel } from "survey-core";
import { useStorageView } from "../../use-cases/view-protected-files/use-storage-view.hook";
import { useStorageUpload } from "../../use-cases/upload-user-files/use-storage-upload.hook";
import { useAssetStorage, AssetStorageTokens } from "../asset-storage.context";
import { registerProtectedFilePreview } from "../../use-cases/view-protected-files/ui/protected-file-preview";

interface UseSurveyStorageProps {
  model: SurveyModel | null;
  formId: string;
  submissionId?: string;
  onSubmissionIdChange?: (newSubmissionId: string) => void;
  readTokenPromises?: AssetStorageTokens;
}

/**
 * Orchestrator hook to activate and configure storage functionality with SurveyModel
 * @returns {Object} { registerStorageHandlers, isStorageReady } - Function to register all storage event handlers and readiness flag.
 */
export function useStorageWithSurvey({
  model,
  formId,
  submissionId,
  onSubmissionIdChange,
  readTokenPromises: propsReadTokenPromises,
}: UseSurveyStorageProps) {
  const [isStorageReady, setIsStorageReady] = useState(false);
  const { config: storageConfig, tokens: contextTokens } = useAssetStorage();
  const readTokenPromises = propsReadTokenPromises ?? contextTokens;

  const { setModelMetadata, registerViewHandlers } =
    useStorageView(readTokenPromises);
  const { registerUploadHandlers } = useStorageUpload({
    surveyModel: model ?? null,
    formId,
    submissionId,
    onSubmissionIdChange,
    readTokenPromises,
  });

  useMemo(() => {
    if (model) {
      setModelMetadata(model);
    }
  }, [model, setModelMetadata]);

  useEffect(() => {
    registerProtectedFilePreview();
  }, []);

  /**
   * Registers all storage-related handlers (upload and view) to the provided model.
   * @param surveyModel The model to register handlers on.
   * @returns A cleanup function to unregister all handlers.
   */
  const registerStorageHandlers = useCallback(
    (surveyModel: SurveyModel) => {
      if (!storageConfig?.isEnabled) {
        setIsStorageReady(true);
        return () => {};
      }

      const unregisterUpload = registerUploadHandlers(surveyModel);
      let unregisterView = () => {};

      if (storageConfig.isPrivate) {
        unregisterView = registerViewHandlers(surveyModel);
      }

      setIsStorageReady(true);

      return () => {
        setIsStorageReady(false);
        unregisterUpload?.();
        unregisterView?.();
      };
    },
    [storageConfig, registerUploadHandlers, registerViewHandlers],
  );

  return { registerStorageHandlers, isStorageReady };
}
