import { DataListSummary } from "@/lib/endatix-api/data-lists/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { Result } from "@/lib/result";
import { getDataListsAction } from "@/features/data-lists/list/get-data-lists.action";
import { SurveyCreatorModel } from "survey-creator-core";
import { Model } from "survey-core";
import { bindDataListsToCreator, setDataListPropertyChoices } from "../infrastructure/creator-bindings";
import { registerDataListGlobals } from "../infrastructure/registry";
import { bindDataListsToSurvey } from "../infrastructure/survey-bindings";

interface UseDataListsApi {
  initGlobals: () => void;
  bindToCreator: (creator: SurveyCreatorModel) => (() => void) | undefined;
  bindToSurvey: (model: Model) => (() => void) | undefined;
  setAvailableDataLists: (dataLists: DataListSummary[]) => void;
}

export function useDataLists(): UseDataListsApi {
  const creatorBoundRef = useRef(false);
  const surveyBoundRef = useRef(false);

  const initGlobals = useCallback(() => {
    registerDataListGlobals();
  }, []);

  const setAvailableDataLists = useCallback((dataLists: DataListSummary[]) => {
    setDataListPropertyChoices(dataLists);
  }, []);

  const bindToCreator = useCallback((creator: SurveyCreatorModel) => {
    if (!creator || creatorBoundRef.current) {
      return;
    }

    creatorBoundRef.current = true;
    const unbind = bindDataListsToCreator(creator);

    return () => {
      unbind();
      creatorBoundRef.current = false;
    };
  }, []);

  const bindToSurvey = useCallback((model: Model) => {
    if (!model || surveyBoundRef.current) {
      return;
    }

    surveyBoundRef.current = true;
    const unbind = bindDataListsToSurvey(model);

    return () => {
      unbind();
      surveyBoundRef.current = false;
    };
  }, []);

  return {
    initGlobals,
    bindToCreator,
    bindToSurvey,
    setAvailableDataLists,
  };
}

export function useDataListsLoader() {
  const [dataLists, setDataLists] = useState<DataListSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDataLists = async () => {
      setIsLoading(true);
      try {
        const result = await getDataListsAction();
        if (result === undefined || Result.isError(result)) {
          console.error("Failed to fetch data lists for creator.");
          return;
        }
        setDataLists(result.value);
      } finally {
        setIsLoading(false);
      }
    };

    loadDataLists();
  }, []);

  return { dataLists, isLoading };
}
