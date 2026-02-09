"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ReactElementFactory } from "survey-react-ui";
import type { Model } from "survey-core";
import type { ExtensionDefinition, ExtensionModule } from "../types";

const loadedModules = new Map<string, ExtensionModule>();
const loadingPromises = new Map<string, Promise<ExtensionModule | undefined>>();
const initializedKeys = new Set<string>();

export interface UseExtensionLoaderOptions {
  allExtensions: ExtensionDefinition[];
  extensionIdsToLoad: string[];
}

export function useExtensionLoader({
  allExtensions,
  extensionIdsToLoad,
}: UseExtensionLoaderOptions) {
  const [ready, setReady] = useState(false);
  const extensionIdsKey = extensionIdsToLoad.join(",");
  const mountedRef = useRef(true);

  // Filter extensions based on IDs
  // We use useMemo to avoid recalculating on every render, though filtering is cheap
  const extensionsToLoad = allExtensions.filter((ext) =>
    extensionIdsToLoad.includes(ext.id),
  );

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      if (extensionsToLoad.length === 0) {
        setReady(true);
        return;
      }

      if (initializedKeys.has(extensionIdsKey)) {
        setReady(true);
        return;
      }

      await Promise.all(
        extensionsToLoad.map(async (ext) => {
          if (loadedModules.has(ext.id)) return;

          let promise = loadingPromises.get(ext.id);
          if (!promise) {
            promise = (async () => {
              try {
                const mod = await ext.load?.();
                if (!mod) {
                  return undefined;
                }

                mod.onInit?.();
                console.debug(
                  `✓ [ExtensionLoader] Initialized extension: ${ext.id}`,
                );

                const Component = mod.Component;
                if (Component && ext.metadata) {
                  ReactElementFactory.Instance.registerElement(
                    ext.metadata.name,
                    (props) => <Component {...props} key={ext.id} />,
                  );
                }
                loadedModules.set(ext.id, mod);
                return mod;
              } catch (error) {
                console.error(
                  `✗ [ExtensionLoader] Error initializing extension ${ext.id}:`,
                  error,
                );
                return undefined;
              } finally {
                loadingPromises.delete(ext.id);
              }
            })();

            loadingPromises.set(ext.id, promise);
          }

          await promise;
        }),
      );

      if (mountedRef.current) {
        initializedKeys.add(extensionIdsKey);
        setReady(true);
      }
    };

    init();

    return () => {
      mountedRef.current = false;
    };
    // Intentionally depend only on extensionIdsKey to avoid re-running when array refs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extensionIdsKey]);

  const onModelCreated = useCallback(
    (model: Model) => {
      const currentExtensionsToLoad = allExtensions.filter((ext) =>
        extensionIdsToLoad.includes(ext.id),
      );

      currentExtensionsToLoad.forEach((ext) => {
        const mod = loadedModules.get(ext.id);
        mod?.onModelReady?.(model);
      });
    },
    [allExtensions, extensionIdsToLoad],
  );

  return { isReady: ready, onModelCreated };
}
