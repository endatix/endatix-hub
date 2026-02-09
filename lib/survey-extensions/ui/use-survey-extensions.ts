"use client";

import { useExtensionLoader } from "./use-extension-loader";
import { getRequiredExtensionIds } from "../server/analyzer";
import { coreExtensions } from "../core-registry";
import { userExtensions } from "../../../extensions/user-extensions";
import type { ExtensionDefinition } from "../types";
import { useMemo } from "react";

const ALL_EXTENSIONS: ExtensionDefinition[] = [
  ...coreExtensions,
  ...userExtensions,
];

export interface UseSurveyExtensionsOptions {
  /** When provided, only these extension IDs are loaded (e.g. from server). */
  extensionIdsToLoad?: string[];
  /** When provided, active IDs are computed via shouldLoad (client-side). */
  formJson?: unknown;
}

export function useSurveyExtensions({
  extensionIdsToLoad,
  formJson,
}: UseSurveyExtensionsOptions) {
  const ids = useMemo(
    () =>
      extensionIdsToLoad ??
      (formJson != null
        ? getRequiredExtensionIds(formJson, ALL_EXTENSIONS)
        : ALL_EXTENSIONS.map((e) => e.id)),
    [extensionIdsToLoad, formJson],
  );

  return useExtensionLoader({
    allExtensions: ALL_EXTENSIONS,
    extensionIdsToLoad: ids,
  });
}

export { ALL_EXTENSIONS };
