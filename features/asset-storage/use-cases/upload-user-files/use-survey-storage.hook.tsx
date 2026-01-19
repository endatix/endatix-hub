"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SurveyModel } from "survey-core";
import { useStorageView } from "../view-protected-files/use-storage-view.hook";
import { useStorageUpload } from "./use-storage-upload.hook";
import {
  useStorageConfig,
  StorageTokens,
  useStorageTokens,
} from "../../infrastructure/storage-config.context";
import { registerProtectedFilePreview } from "../view-protected-files/ui/protected-file-preview";

interface UseSurveyStorageProps {
  model: SurveyModel | null;
  formId: string;
  submissionId?: string;
  onSubmissionIdChange?: (newSubmissionId: string) => void;
  readTokenPromises?: StorageTokens;
}

/**
 * Hook to provide storage feature activation for a SurveyModel.
 * @returns {Object} { registerStorageHandlers, isStorageReady } - Function to register all storage event handlers and readiness flag.
 */
export function useSurveyStorage({
  model,
  formId,
  submissionId,
  onSubmissionIdChange,
  readTokenPromises: propsReadTokenPromises,
}: UseSurveyStorageProps) {
  const storageConfig = useStorageConfig();
  const contextTokens = useStorageTokens();
  const readTokenPromises = propsReadTokenPromises ?? contextTokens;

  const [isStorageReady, setIsStorageReady] = useState(false);
  const { setModelMetadata, registerViewHandlers } =
    useStorageView(readTokenPromises);
  const { registerUploadHandlers } = useStorageUpload({
    surveyModel: model ?? null,
    formId,
    submissionId,
    onSubmissionIdChange,
    readTokenPromises,
  });

  useEffect(() => {
    registerProtectedFilePreview();
  }, []);

  useMemo(() => {
    if (model) {
      setModelMetadata(model);
    }
  }, [model, setModelMetadata]);

  /**
   * Registers all storage-related handlers (upload and view) to the provided model.
   * @param surveyModel The model to register handlers on.
   * @returns A cleanup function to unregister all handlers.
   */
  const registerStorageHandlers = useCallback(
    (surveyModel: SurveyModel) => {
      if (!readTokenPromises || !storageConfig?.isEnabled) {
        setIsStorageReady(true);
        return () => { };
      }

      const unregisterUpload = registerUploadHandlers(surveyModel);
      let unregisterView = () => { };

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
    [
      storageConfig,
      readTokenPromises,
      registerUploadHandlers,
      registerViewHandlers,
    ],
  );

  return { registerStorageHandlers, isStorageReady };
}
