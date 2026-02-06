"use client";

import { useEffect, useMemo } from "react";
import { ExtensionProvider } from "@/lib/survey-extensions";
import { coreExtensions } from "@/lib/survey-extensions/core-registry";
import { userExtensions } from "./user-extensions";

interface SurveyExtensionsProps {
  children: React.ReactNode;
  /**
   * Optional list of extension IDs to activate.
   *
   * - If provided: Only these extensions will be loaded (performance optimization)
   * - If omitted: ALL extensions (core + user) will be loaded (for Creator/Editor)
   *
   * Use server-side analysis to determine which extensions are needed:
   * @example
   * const required = getRequiredExtensionIds(formJson, allExtensions);
   * <SurveyExtensions activeIds={required}>
   */
  activeIds?: string[];
}

/**
 * Survey Extensions Bootstrapper
 *
 * Merges core and user extensions, handles smart preloading,
 * and provides extension context to child components.
 *
 * ## Merge Strategy (No Conflicts!)
 * - **Core Extensions**: Maintained by Endatix in core-registry.ts
 * - **User Extensions**: Managed by you in user-extensions.ts
 * - Merged at runtime, so upstream updates don't conflict with your customizations
 *
 * ## Performance Optimization
 * When `activeIds` is provided (e.g., from server-side analysis),
 * only those extensions are loaded, reducing bundle size for end users.
 */
export function SurveyExtensions({
  children,
  activeIds,
}: SurveyExtensionsProps) {
  const allExtensions = useMemo(() => {
    return [...coreExtensions, ...userExtensions];
  }, []);

  const activeExtensions = useMemo(() => {
    if (!activeIds) {
      return allExtensions;
    }

    return allExtensions.filter((ext) => activeIds.includes(ext.id));
  }, [allExtensions, activeIds]);

  // TTI Optimization: Preload Extension Chunks to speed up network requests
  useEffect(() => {
    activeExtensions.forEach((ext) => {
      if ("loader" in ext && ext.loader) {
        ext
          .loader()
          .catch((err) =>
            console.error(`[Endatix] Failed to preload ${ext.name}:`, err),
          );
      }
    });
  }, [activeExtensions]);

  return (
    <ExtensionProvider extensions={activeExtensions}>
      {children}
    </ExtensionProvider>
  );
}
