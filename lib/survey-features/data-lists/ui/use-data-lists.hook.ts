import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import { useCallback, useRef } from "react";
import { SurveyCreatorModel } from "survey-creator-core";
import { Model } from "survey-core";
import { bindDataListsToCreator } from "../infrastructure/creator-bindings";
import { registerDataListGlobals } from "../infrastructure/registry";
import { bindDataListsToSurvey } from "../infrastructure/survey-bindings";

interface UseDataListsApi {
  initGlobals: () => void;
  bindToCreator: (
    creator: SurveyCreatorModel,
    deps: ExtensionRuntimeDeps,
  ) => (() => void) | undefined;
  bindToSurvey: (
    model: Model,
    deps: ExtensionRuntimeDeps,
  ) => (() => void) | undefined;
}

export function useDataLists(): UseDataListsApi {
  const creatorBoundRef = useRef(false);
  const surveyBoundRef = useRef(false);

  const initGlobals = useCallback(() => {
    registerDataListGlobals();
  }, []);

  const bindToCreator = useCallback(
    (creator: SurveyCreatorModel, deps: ExtensionRuntimeDeps) => {
      if (!creator || creatorBoundRef.current) {
        return;
      }

      creatorBoundRef.current = true;
      const unbind = bindDataListsToCreator(creator, deps);

      return () => {
        unbind();
        creatorBoundRef.current = false;
      };
    },
    [],
  );

  const bindToSurvey = useCallback(
    (model: Model, deps: ExtensionRuntimeDeps) => {
      if (!model || surveyBoundRef.current) {
        return;
      }

      surveyBoundRef.current = true;
      const unbind = bindDataListsToSurvey(model, deps);

      return () => {
        unbind();
        surveyBoundRef.current = false;
      };
    },
    [],
  );

  return {
    initGlobals,
    bindToCreator,
    bindToSurvey,
  };
}
