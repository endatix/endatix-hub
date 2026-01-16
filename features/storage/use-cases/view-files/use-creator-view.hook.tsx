"use client";

import { useCallback } from "react";
import {
  SurveyCreatorModel,
  SurveyInstanceCreatedEvent,
} from "survey-creator-core";
import { useStorageConfig } from "../../infrastructure";
import { useStorageView } from "../view-files/use-storage-view.hook";
import { ReadTokensResult } from "../../types";

interface UseCreatorViewProps {
  readTokenPromises?: {
    userFiles: Promise<ReadTokensResult>;
    content: Promise<ReadTokensResult>;
  };
}

/**
 * Hook to handle private file viewing in SurveyJS Creator.
 * Decorates every internal survey instance (Designer, Preview, Property Grid) with SAS tokens.
 */
export function useCreatorView({ readTokenPromises }: UseCreatorViewProps) {
  const storageConfig = useStorageConfig();
  const { setModelMetadata, registerViewHandlers } = useStorageView(readTokenPromises);

  /**
   * Registers the view decoration handler to the SurveyJS Creator instance.
   * @param creator The SurveyCreatorModel instance.
   * @returns A cleanup function to unregister the handler.
   */
  const registerViewHandlersInCreator = useCallback(
    (creator: SurveyCreatorModel) => {
      const handleSurveyInstanceCreated = (
        _: SurveyCreatorModel,
        options: SurveyInstanceCreatedEvent,
      ) => {
        // Always set metadata (synchronous flags)
        setModelMetadata(options.survey);

        // Register view handlers if storage is private
        if (storageConfig?.isPrivate) {
          registerViewHandlers(options.survey);
        }
      };

      creator.onSurveyInstanceCreated.add(handleSurveyInstanceCreated);

      return () => {
        creator.onSurveyInstanceCreated.remove(handleSurveyInstanceCreated);
      };
    },
    [storageConfig?.isPrivate, setModelMetadata, registerViewHandlers],
  );

  return {
    registerViewHandlers: registerViewHandlersInCreator,
  };
}
