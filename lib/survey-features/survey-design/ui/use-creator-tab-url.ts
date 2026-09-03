"use client";

import { useEffect } from "react";
import type { SurveyCreatorModel } from "survey-creator-core";
import { CREATOR_TAB_QUERY_KEY } from "@/lib/survey-js";
import { useUrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { loadTabFromUrl } from "../use-cases/load-tab-from-url";
import {
  bindSetTabToUrl,
  setTabToUrlQueryValue,
} from "../use-cases/set-tab-to-url";

export function useCreatorTabUrl(creator: SurveyCreatorModel | null) {
  const { searchParams, updateUrl } = useUrlSearchParamsUpdater();
  const queryValue = searchParams.get(CREATOR_TAB_QUERY_KEY);

  useEffect(() => {
    if (!creator) {
      return;
    }

    const resolved = loadTabFromUrl(creator, queryValue);
    updateUrl({
      [CREATOR_TAB_QUERY_KEY]: setTabToUrlQueryValue(resolved),
    });
  }, [creator, queryValue, updateUrl]);

  useEffect(() => {
    if (!creator) {
      return;
    }

    return bindSetTabToUrl(creator, (nextQueryValue) => {
      updateUrl({
        [CREATOR_TAB_QUERY_KEY]: nextQueryValue,
      });
    });
  }, [creator, updateUrl]);
}
