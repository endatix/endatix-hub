"use client";

import { useEffect, useState, useMemo } from "react";
import { ExtensionProvider } from "@/lib/survey-extensions";
import { coreExtensions } from "@/lib/survey-extensions/core-registry";
import { userExtensions } from "./user-extensions";
import type {
  ExtensionDefinition,
  ExtensionImplementation,
  ExtensionScope,
} from "@/lib/survey-extensions";
import { extensionRegistry } from "@/lib/survey-extensions";

interface SurveyExtensionsProps {
  children: React.ReactNode;
  /**
   * IDs detected on the server.
   * If provided, ONLY these are loaded (optimized for public forms).
   * If undefined, ALL are loaded (for creator/editor mode).
   */
  activeIds?: string[];
  /**
   * Scope filter: which extensions to load based on where they run.
   * Defaults to 'form' for public forms, 'editor' for creator.
   */
  scope?: ExtensionScope;
}

interface LoadedExtension {
  id: string;
  implementation: ExtensionImplementation;
}

/**
 * SurveyExtensions - Client Bootstrapper Component
 *
 * This component:
 * 1. Merges core and user extension registries (no conflicts!)
 * 2. Filters based on activeIds (server-side analysis) and scope
 * 3. Triggers smart preloading of extension chunks
 * 4. Provides extensions to the app via ExtensionProvider
 *
 * ## Usage in Public Forms (Optimized TTI):
 * ```tsx
 * const requiredIds = getRequiredExtensionIds(form.definition);
 * <SurveyExtensions activeIds={requiredIds} scope="form">
 *   <PublicForm />
 * </SurveyExtensions>
 * ```
 *
 * ## Usage in Form Editor (Load All):
 * ```tsx
 * <SurveyExtensions scope="editor">
 *   <FormDesigner />
 * </SurveyExtensions>
 * ```
 */
export function SurveyExtensions({
  children,
  activeIds,
  scope = "form",
}: SurveyExtensionsProps) {
  const [loadedExtensions, setLoadedExtensions] = useState<LoadedExtension[]>(
    [],
  );

  const allExtensions = useMemo(() => {
    const extensionMap = new Map<string, ExtensionDefinition>();

    coreExtensions.forEach((ext) => extensionMap.set(ext.id, ext));
    userExtensions.forEach((ext) => extensionMap.set(ext.id, ext));

    return Array.from(extensionMap.values());
  }, []);

  const extensionsToLoad = useMemo(() => {
    let filtered = allExtensions;

    if (activeIds) {
      filtered = filtered.filter((ext) => activeIds.includes(ext.id));
    }

    filtered = filtered.filter((ext) => ext.scopes.includes(scope));

    return filtered;
  }, [allExtensions, activeIds, scope]);

  useEffect(() => {
    extensionRegistry.registerDefinitions(extensionsToLoad);
  }, [extensionsToLoad]);

  useEffect(() => {
    let isMounted = true;

    const loadImplementations = async () => {
      if (extensionsToLoad.length === 0) {
        console.debug("[Endatix] No extensions to load for scope:", scope);
        setLoadedExtensions([]);
        return;
      }

      try {
        const promises = extensionsToLoad.map(async (ext) => {
          if (!ext.loader) {
            console.warn(`[Endatix] Extension ${ext.id} has no loader`);
            return null;
          }

          try {
            const impl = await ext.loader();
            console.debug(`[Endatix] Loaded extension: ${ext.id}`);

            return { id: ext.id, implementation: impl };
          } catch (error) {
            console.error(
              `[Endatix] Failed to load extension ${ext.id}:`,
              error,
            );
            return null;
          }
        });

        const results = await Promise.all(promises);

        if (isMounted) {
          const validExtensions = results.filter(
            (ext): ext is LoadedExtension => ext !== null,
          );
          setLoadedExtensions(validExtensions);
        }
      } catch (error) {
        console.error("[Endatix] Error loading extensions:", error);
        if (isMounted) {
          setLoadedExtensions([]);
        }
      }
    };

    loadImplementations();

    return () => {
      isMounted = false;
    };
  }, [extensionsToLoad, scope]);

  const implementationMap = useMemo(() => {
    const map = new Map<string, ExtensionImplementation>();
    loadedExtensions.forEach(({ id, implementation }) => {
      map.set(id, implementation);
    });
    return map;
  }, [loadedExtensions]);

  return (
    <ExtensionProvider implementations={implementationMap}>
      {children}
    </ExtensionProvider>
  );
}
