"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { SurveyCreatorModel } from "survey-creator-core";
import {
  CREATOR_TAB_QUERY_KEY,
  serializeCreatorTabUrlSlug,
} from "@/lib/survey-js";
import { loadTabFromUrl } from "../use-cases/load-tab-from-url";
import { bindSetTabToUrl } from "../use-cases/set-tab-to-url";

function replaceTabQuery(nextQueryValue: string | null) {
  const url = new URL(globalThis.window.location.href);
  if (nextQueryValue) {
    url.searchParams.set(CREATOR_TAB_QUERY_KEY, nextQueryValue);
  } else {
    url.searchParams.delete(CREATOR_TAB_QUERY_KEY);
  }

  const href = `${url.pathname}${url.search}${url.hash}`;
  const current = `${globalThis.window.location.pathname}${globalThis.window.location.search}${globalThis.window.location.hash}`;
  if (href === current) {
    return;
  }

  globalThis.window.history.replaceState(null, "", href);
}

/** Keeps the Creator's active tab and `?tab=` in sync, both ways. */
export function useCreatorTabUrl(creator: SurveyCreatorModel | null) {
  const searchParams = useSearchParams();
  const queryValue = searchParams.get(CREATOR_TAB_QUERY_KEY);

  useEffect(() => {
    if (!creator) {
      return;
    }

    const resolved = loadTabFromUrl(creator, queryValue);
    replaceTabQuery(serializeCreatorTabUrlSlug(resolved));
  }, [creator, queryValue]);

  useEffect(() => {
    if (!creator) {
      return;
    }

    return bindSetTabToUrl(creator, replaceTabQuery);
  }, [creator]);
}
