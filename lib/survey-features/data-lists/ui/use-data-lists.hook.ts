import { DataList } from "@/lib/endatix-api/data-lists/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDataListsAction } from "@/features/data-lists/view-lists/get-data-lists.action";
import { SurveyCreatorModel } from "survey-creator-core";
import { Model } from "survey-core";
import {
  bindDataListsToCreator,
  setDataListPropertyChoices,
} from "../infrastructure/creator-bindings";
import { registerDataListGlobals } from "../infrastructure/registry";
import { bindDataListsToSurvey } from "../infrastructure/survey-bindings";
import { FormRuntimeState } from "@/lib/form-runtime/form-runtime.context";

interface UseDataListsApi {
  initGlobals: () => void;
  bindToCreator: (
    creator: SurveyCreatorModel,
    getRuntimeState: () => FormRuntimeState,
  ) => (() => void) | undefined;
  bindToSurvey: (
    model: Model,
    getRuntimeState: () => FormRuntimeState,
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
    (creator: SurveyCreatorModel, getRuntimeState: () => FormRuntimeState) => {
      if (!creator || creatorBoundRef.current) {
        return;
      }

      creatorBoundRef.current = true;
      const unbind = bindDataListsToCreator(creator, getRuntimeState);

      return () => {
        unbind();
        creatorBoundRef.current = false;
      };
    },
    [],
  );

  const bindToSurvey = useCallback(
    (model: Model, getRuntimeState: () => FormRuntimeState) => {
      if (!model || surveyBoundRef.current) {
        return;
      }

      surveyBoundRef.current = true;
      const unbind = bindDataListsToSurvey(model, getRuntimeState);

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

  useEffect(() => {
    const loadDataLists = async () => {
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
    };

    loadDataLists();
  }, []);

  return { dataLists, isLoading };
}
