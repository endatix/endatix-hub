"use client";

import { useMemo } from "react";
import { useEndatixConfig } from "@/components/providers/endatix-config-provider";
import { useExtensionLoader } from "./use-extension-loader";
import { getRequiredExtensionIds } from "../server/analyzer";
import { coreExtensions } from "../core-registry";
import { userExtensions } from "../../../extensions/user-extensions";
import type { ExtensionDefinition, ExtensionRuntimeDeps } from "../types";

const ALL_EXTENSIONS: ReadonlyArray<ExtensionDefinition> = Object.freeze([
  ...coreExtensions,
  ...userExtensions,
]);

export interface UseSurveyExtensionsOptions {
  /** When provided, only these extension IDs are loaded (e.g. from server). */
  extensionIdsToLoad?: string[];
  /** When provided, active IDs are computed via shouldLoad (client-side). */
  formJson?: unknown;
  /** Runtime dependencies available to extension lifecycle hooks. */
  runtimeDeps: ExtensionRuntimeDeps;
}

export function useSurveyExtensions({
  extensionIdsToLoad,
  formJson,
  runtimeDeps,
}: UseSurveyExtensionsOptions) {
  const { extensionsEnabled } = useEndatixConfig();

  const ids = useMemo(() => {
    if (!extensionsEnabled) {
      return [];
    }

    if (extensionIdsToLoad) {
      return extensionIdsToLoad;
    }

    if (formJson) {
      return getRequiredExtensionIds(formJson, ALL_EXTENSIONS);
    }

    return ALL_EXTENSIONS.map((extension: ExtensionDefinition) => extension.id);
  }, [extensionIdsToLoad, formJson, extensionsEnabled]);

  return useExtensionLoader({
    allExtensions: ALL_EXTENSIONS,
    extensionIdsToLoad: ids,
    runtimeDeps,
  });
}

export { ALL_EXTENSIONS };
