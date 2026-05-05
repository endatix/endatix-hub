import { DataList } from "@/lib/endatix-api/data-lists/types";
import { getDataListsAction } from "@/features/data-lists/view-lists/get-data-lists.action";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { SurveyCreatorModel } from "survey-creator-core";
import { Model } from "survey-core";
import {
  bindDataListsToCreator,
  setDataListPropertyChoices,
} from "../infrastructure/creator-bindings";
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
  setAvailableDataLists: (dataLists: DataList[]) => void;
}

export function useDataLists(): UseDataListsApi {
  const creatorBoundRef = useRef(false);
  const surveyBoundRef = useRef(false);

  const initGlobals = useCallback(() => {
    registerDataListGlobals();
  }, []);

  const setAvailableDataLists = useCallback((dataLists: DataList[]) => {
    setDataListPropertyChoices(dataLists);
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
    setAvailableDataLists,
  };
}

export function useDataListsLoader() {
  const [dataLists, setDataLists] = useState<DataList[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDataLists = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getDataListsAction();
      if (!result.success) {
        console.error("Failed to fetch data lists for creator.");
        return;
      }
      setDataLists(result.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDataLists();
  }, [loadDataLists]);

  return { dataLists, isLoading, refetch: loadDataLists };
}
