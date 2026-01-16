"use client";

import { useCallback, useMemo, useState } from "react";
import { SurveyModel } from "survey-core";
import { ReadTokensResult } from "../types";
import { useStorageView } from "../use-cases/view-protected-files/use-storage-view.hook";
import { useStorageUpload } from "../use-cases/upload-files/use-storage-upload.hook";
import { useStorageConfig } from "../infrastructure";

interface UseSurveyStorageProps {
  model: SurveyModel | null;
  formId: string;
  submissionId?: string;
  onSubmissionIdChange?: (newSubmissionId: string) => void;
  readTokenPromises?: {
    userFiles: Promise<ReadTokensResult>;
    content: Promise<ReadTokensResult>;
  };
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
  readTokenPromises,
}: UseSurveyStorageProps) {
  const storageConfig = useStorageConfig();
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
    [
      storageConfig,
      readTokenPromises,
      registerUploadHandlers,
      registerViewHandlers,
    ],
  );

  return { registerStorageHandlers, isStorageReady };
}
