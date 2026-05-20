"use client";

import { useCallback, useEffect, useState } from "react";
import { SurveyModel } from "survey-core";
import { useStorageView } from "../../use-cases/view-protected-files/use-storage-view.hook";
import { useStorageUpload } from "../../use-cases/upload-user-files/use-storage-upload.hook";
import { useAssetStorage } from "../asset-storage.context";
import { useStorageReadRuntime } from "../use-storage-read-runtime";

interface UseSurveyStorageProps {
  model: SurveyModel | null;
  formId: string;
  getSubmissionId?: () => string | undefined;
  onSubmissionIdChange?: (newSubmissionId: string) => void;
}

/**
 * Orchestrator hook for SurveyJS runtime storage using public or hub storage policy.
 */
export function useStorageWithSurvey({
  model,
  formId,
  getSubmissionId,
  onSubmissionIdChange,
}: UseSurveyStorageProps) {
  const [isStorageReady, setIsStorageReady] = useState(false);
  const { config: storageConfig } = useAssetStorage();

  const getReadRuntime = useStorageReadRuntime({ formId, getSubmissionId });

  const { setModelMetadata, prefetchPrivateReadUrlsForModel } = useStorageView({
    getReadRuntime,
  });

  const { registerUploadHandlers } = useStorageUpload({
    surveyModel: model ?? null,
    formId,
    getSubmissionId,
    onSubmissionIdChange,
    getReadRuntime,
  });

  const needsPrivatePrefetch =
    Boolean(storageConfig?.isEnabled) && Boolean(storageConfig?.isPrivate);

  useEffect(() => {
    if (model) {
      setModelMetadata(model);
    }
  }, [model, setModelMetadata]);

  useEffect(() => {
    if (!model || !needsPrivatePrefetch) {
      return;
    }
    void prefetchPrivateReadUrlsForModel(model);
  }, [model, needsPrivatePrefetch, prefetchPrivateReadUrlsForModel]);

  const registerStorageHandlers = useCallback(
    (surveyModel: SurveyModel) => {
      if (!storageConfig?.isEnabled) {
        setIsStorageReady(true);
        return () => {};
      }

      const unregisterUpload = registerUploadHandlers(surveyModel);

      setIsStorageReady(true);

      return () => {
        setIsStorageReady(false);
        unregisterUpload?.();
      };
    },
    [storageConfig, registerUploadHandlers],
  );

  return { registerStorageHandlers, isStorageReady };
}
