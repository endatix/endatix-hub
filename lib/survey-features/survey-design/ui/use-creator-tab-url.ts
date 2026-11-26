"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import type { SurveyCreatorModel } from "survey-creator-core";
import {
  CREATOR_TAB_QUERY_KEY,
  serializeCreatorTabUrlSlug,
} from "@/lib/survey-js";
import { loadTabFromUrl } from "../use-cases/load-tab-from-url";
import { bindSetTabToUrl } from "../use-cases/set-tab-to-url";

function replaceTabQuery(nextQueryValue: string | null) {
  const { location, history } = globalThis.window;
  const url = new URL(location.href);
  if (nextQueryValue) {
    url.searchParams.set(CREATOR_TAB_QUERY_KEY, nextQueryValue);
  } else {
    url.searchParams.delete(CREATOR_TAB_QUERY_KEY);
  }

  if (url.search === location.search) {
    return;
  }

  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function usePublishTab(creator: SurveyCreatorModel | null, saving: boolean) {
  const deferred = useRef<{ creator: SurveyCreatorModel; slug: string | null } | null>(null);
  useEffect(() => {
    if (!creator) return;
    if (!saving && deferred.current?.creator === creator) {
      replaceTabQuery(deferred.current.slug);
      deferred.current = null;
    }
    return bindSetTabToUrl(creator, slug => {
      // Revalidating server actions target the URL that started the save. Changing
      // its query mid-flight can make Next replace the document on the next refresh.
      if (saving) deferred.current = { creator, slug };
      else replaceTabQuery(slug);
    });
  }, [creator, saving]);
}

export function useCreatorTabUrl(creator: SurveyCreatorModel | null, saving = false) {
  const searchParams = useSearchParams();
  const queryValue = searchParams.get(CREATOR_TAB_QUERY_KEY);

  useEffect(() => {
    if (!creator) {
      return;
    }

    const resolved = loadTabFromUrl(creator, queryValue);
    replaceTabQuery(serializeCreatorTabUrlSlug(resolved));
  }, [creator, queryValue]);

  usePublishTab(creator, saving);
}
