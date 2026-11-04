"use client";

import { useCallback, useEffect, useState } from "react";
import type { Route } from "next";
import { getTableReturnHref } from "@/lib/list-page/table-return-to";
import { formRoutes } from "@/lib/routes/form-routes";
import {
  AUDIENCE_TABLE_KEY,
  parseAudienceReturnQuery,
} from "../audience-return-to";

function rememberedAudienceHref(
  formId: string,
  fallback: Route,
  buildHref: (query: string) => string,
): Route {
  // getTableReturnHref returns string; buildHref already returned a Route.
  return getTableReturnHref(
    AUDIENCE_TABLE_KEY,
    fallback,
    parseAudienceReturnQuery,
    buildHref,
    formId,
  ) as Route;
}

/** Restores this tab's last Audience query; a new tab gets the bare list. */
export function useAudienceReturnHref(formId: string): Route {
  const fallback = formRoutes.audience(formId);
  const [href, setHref] = useState<Route>(fallback);
  const buildHref = useCallback(
    (search: string) => formRoutes.audience(formId, { search }),
    [formId],
  );

  useEffect(() => {
    setHref(rememberedAudienceHref(formId, fallback, buildHref));
  }, [formId, fallback, buildHref]);

  return href;
}
