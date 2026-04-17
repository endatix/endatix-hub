"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { ReactElementFactory } from "survey-react-ui";
import type { Model } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";
import type { ExtensionDefinition, ExtensionModule } from "../types";

// Global state stays outside to persist across renders/mounts
const loadedModules = new Map<string, ExtensionModule>();
const loadingPromises = new Map<string, Promise<ExtensionModule | undefined>>();
const initializedExtensionIds = new Set<string>();
const initializedLoadSets = new Set<string>();

function getLoadingMode(extension: ExtensionDefinition): "static" | "dynamic" {
  return extension.loading;
}

function getBootstrap(
  extension: ExtensionDefinition,
): (() => void) | undefined {
  if (extension.loading === "static") {
    return extension.bootstrap;
  }

  return undefined;
}

function getLoader(
  extension: ExtensionDefinition,
): (() => Promise<ExtensionModule>) | undefined {
  if (extension.loading === "dynamic") {
    return extension.load;
  }

  return undefined;
}

function initializeStaticExtensions(extensions: ExtensionDefinition[]) {
  extensions.forEach((extension) => {
    if (getLoadingMode(extension) !== "static") {
      return;
    }

    if (initializedExtensionIds.has(extension.id)) {
      return;
    }

    const bootstrap = getBootstrap(extension);
    if (!bootstrap) {
      return;
    }

    try {
      bootstrap();
      initializedExtensionIds.add(extension.id);
      console.debug(
        `✓ [ExtensionLoader] Initialized extension: ${extension.id}`,
      );
    } catch (error) {
      console.error(`✗ [ExtensionLoader] Error: ${extension.id}`, error);
    }
  });
}

export interface UseExtensionLoaderOptions {
  allExtensions: ReadonlyArray<ExtensionDefinition>;
  extensionIdsToLoad: string[];
}

/**
 * Atomic helper to load a single extension.
 * This flattens the nested 'ifs' from the original hook.
 */
async function loadSingleExtension(ext: ExtensionDefinition) {
  const loader = getLoader(ext);
  if (!loader) {
    return undefined;
  }

  if (loadedModules.has(ext.id)) return loadedModules.get(ext.id);

  // Check for an existing flight
  let promise = loadingPromises.get(ext.id);
  if (promise) return promise;

  promise = (async () => {
    try {
      const mod = await loader();
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

  const normalizedExtensionIds = useMemo(
    () => Array.from(new Set(extensionIdsToLoad)).sort(),
    [extensionIdsToLoad],
  );
  const extensionIdsKey = normalizedExtensionIds.join(",");
  const extensionsToLoad = useMemo(() => {
    const extensionIdSet = new Set(normalizedExtensionIds);
    return allExtensions.filter((ext: ExtensionDefinition) =>
      extensionIdSet.has(ext.id),
    );
  }, [allExtensions, normalizedExtensionIds]);

  useEffect(() => {
    mountedRef.current = true;

    // Initialize static extensions synchronously.
    initializeStaticExtensions(extensionsToLoad);

    const dynamicExtensions = extensionsToLoad.filter(
      (extension) => getLoadingMode(extension) === "dynamic",
    );

    // Guard to avoid unnecessary dynamic loading
    if (
      dynamicExtensions.length === 0 ||
      initializedLoadSets.has(extensionIdsKey)
    ) {
      setIsReady(true);
      return;
    }

    const init = async () => {
      await Promise.all(dynamicExtensions.map(loadSingleExtension));

      if (mountedRef.current) {
        initializedLoadSets.add(extensionIdsKey);
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

  const onCreatorCreated = useCallback(
    (creator: SurveyCreatorModel) => {
      extensionsToLoad.forEach((ext: ExtensionDefinition) => {
        loadedModules.get(ext.id)?.onCreatorReady?.(creator);
      });
    },
    [extensionsToLoad],
  );

  return { isReady, onModelCreated, onCreatorCreated };
}
