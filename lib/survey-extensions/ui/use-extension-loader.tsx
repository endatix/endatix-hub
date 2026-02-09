"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ReactElementFactory } from "survey-react-ui";
import type { Model } from "survey-core";
import type { ExtensionDefinition, ExtensionModule } from "../types";

// Global state stays outside to persist across renders/mounts
const loadedModules = new Map<string, ExtensionModule>();
const loadingPromises = new Map<string, Promise<ExtensionModule | undefined>>();
const initializedKeys = new Set<string>();

interface UseExtensionLoaderOptions {
  allExtensions: ExtensionDefinition[];
  extensionIdsToLoad: string[];
}

/**
 * Atomic helper to load a single extension.
 * This flattens the nested 'ifs' from the original hook.
 */
async function loadSingleExtension(ext: ExtensionDefinition) {
  if (loadedModules.has(ext.id)) return loadedModules.get(ext.id);

  // Check for an existing flight
  let promise = loadingPromises.get(ext.id);
  if (promise) return promise;

  promise = (async () => {
    try {
      const mod = await ext.load?.();
      if (!mod) {
        return undefined;
      }

      mod.onInit?.();
      console.debug(`✓ [ExtensionLoader] Initialized extension: ${ext.id}`);

      const ExtensionComponent = mod.Component;
      if (ExtensionComponent && ext.metadata) {
        ReactElementFactory.Instance.registerElement(
          ext.metadata.name,
          (props) => <ExtensionComponent {...props} key={ext.id} />,
        );
      }

      loadedModules.set(ext.id, mod);
      return mod;
    } catch (error) {
      console.error(`✗ [ExtensionLoader] Error: ${ext.id}`, error);
      return undefined;
    } finally {
      loadingPromises.delete(ext.id);
    }
  })();

  loadingPromises.set(ext.id, promise);
  return promise;
}

export function useExtensionLoader({
  allExtensions,
  extensionIdsToLoad,
}: UseExtensionLoaderOptions) {
  const [isReady, setIsReady] = useState(false);
  const mountedRef = useRef(true);

  const extensionIdsKey = extensionIdsToLoad.join(",");
  const extensionsToLoad = allExtensions.filter((ext: ExtensionDefinition) =>
    extensionIdsToLoad.includes(ext.id),
  );

  useEffect(() => {
    mountedRef.current = true;

    // Guard to avoid unnecessary loading
    if (extensionsToLoad.length === 0 || initializedKeys.has(extensionIdsKey)) {
      setIsReady(true);
      return;
    }

    const init = async () => {
      await Promise.all(extensionsToLoad.map(loadSingleExtension));

      if (mountedRef.current) {
        initializedKeys.add(extensionIdsKey);
        setIsReady(true);
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
      extensionsToLoad.forEach((ext: ExtensionDefinition) => {
        loadedModules.get(ext.id)?.onModelReady?.(model);
      });
    },
    [extensionsToLoad],
  );

  return { isReady, onModelCreated };
}
