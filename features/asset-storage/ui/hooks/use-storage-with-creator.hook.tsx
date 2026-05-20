"use client";

import { useCallback, useRef, useState } from "react";
import { SurveyCreatorModel } from "survey-creator-core";
import type { SurveyModel } from "survey-core";
import { useContentUpload } from "../../use-cases/upload-content-files/use-content-upload.hook";
import { useStorageView } from "../../use-cases/view-protected-files/use-storage-view.hook";
import { useAssetStorage } from "../asset-storage.context";
import { useStorageReadRuntime } from "../use-storage-read-runtime";

interface UseStorageWithCreatorProps {
  itemId: string;
  itemType: "form" | "template";
}

/**
 * Storage for Survey Creator: upload handlers + view handlers on the active survey instance.
 */
export function useStorageWithCreator({
  itemId,
  itemType,
}: UseStorageWithCreatorProps) {
  const { config: storageConfig } = useAssetStorage();
  const activeSurveyRef = useRef<SurveyModel | null>(null);

  const getReadRuntime = useStorageReadRuntime({
    hubOnly: true,
    creatorFormId: itemType === "form" ? itemId : undefined,
    creatorTemplateId: itemType === "template" ? itemId : undefined,
  });

  const { prefetchPrivateReadUrlsForModel } = useStorageView({
    getReadRuntime,
  });

  const [isStorageReady, setIsStorageReady] = useState(false);

  const { registerUploadHandlers } = useContentUpload({ itemId, itemType });

  const needsPrivateView =
    Boolean(storageConfig?.isEnabled) && Boolean(storageConfig?.isPrivate);

  const attachSurveyViewHandlers = useCallback(
    (survey: SurveyModel | null | undefined) => {
      activeSurveyRef.current = survey ?? null;

      if (!survey || !needsPrivateView) {
        return;
      }

      prefetchPrivateReadUrlsForModel(survey);
    },
    [needsPrivateView, prefetchPrivateReadUrlsForModel],
  );

  const registerStorageHandlers = useCallback(
    (creator: SurveyCreatorModel) => {
      if (!storageConfig?.isEnabled) {
        setIsStorageReady(true);
        return () => {};
      }

      const unregisterUpload = registerUploadHandlers(creator);
      attachSurveyViewHandlers(creator.survey);

      const onActiveTabChanged = () => {
        attachSurveyViewHandlers(creator.survey);
      };

      const onSurveyInstanceCreated = (
        _: unknown,
        options: { survey?: SurveyModel },
      ) => {
        if (options.survey) {
          attachSurveyViewHandlers(options.survey);
        }
      };

      creator.onActiveTabChanged?.add(onActiveTabChanged);
      creator.onSurveyInstanceCreated?.add(onSurveyInstanceCreated);

      setIsStorageReady(true);

      return () => {
        setIsStorageReady(false);
        creator.onActiveTabChanged?.remove(onActiveTabChanged);
        creator.onSurveyInstanceCreated?.remove(onSurveyInstanceCreated);
        unregisterUpload?.();
      };
    },
    [
      storageConfig?.isEnabled,
      registerUploadHandlers,
      attachSurveyViewHandlers,
    ],
  );

  return { registerStorageHandlers, isStorageReady };
}
