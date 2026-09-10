"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { SurveyCreatorModel } from "survey-creator-core";
import {
  CREATOR_TAB_QUERY_KEY,
  serializeCreatorTabUrlSlug,
} from "@/lib/survey-js";
import { hrefWithSearchParamUpdates } from "../use-cases/href-with-search-param-updates";
import { loadTabFromUrl } from "../use-cases/load-tab-from-url";
import { bindSetTabToUrl } from "../use-cases/set-tab-to-url";

/**
 * Writes `?tab=` with the native History API so App Router does not navigate
 * (and therefore does not refetch the last saved definition over live edits).
 * `useSearchParams` still updates — Next.js patches `replaceState`.
 */
function replaceTabQuery(nextQueryValue: string | null) {
  const href = hrefWithSearchParamUpdates(globalThis.window.location.href, {
    [CREATOR_TAB_QUERY_KEY]: nextQueryValue,
  });
  if (!href) {
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
