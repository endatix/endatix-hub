"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { ReactElementFactory } from "survey-react-ui";
import type { Model } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";
import type {
  ExtensionDefinition,
  ExtensionModule,
  ExtensionRuntimeDeps,
} from "../types";

// Global state stays outside to persist across renders/mounts
const loadedModules = new Map<string, ExtensionModule>();
const loadingPromises = new Map<string, Promise<ExtensionModule | undefined>>();
const initializedExtensionIds = new Set<string>();
const initializedLoadSets = new Set<string>();

function getLoadingMode(extension: ExtensionDefinition): "static" | "dynamic" {
  return extension.loading;
}

function logExtensionError(extensionId: string, error: unknown): void {
  console.error(`✗ [ExtensionLoader] Error: ${extensionId}`, error);
}

/**
 * Runs a lifecycle hook so one extension cannot take down the others.
 *
 * A hook may be async (Creator bindings are commonly behind a dynamic
 * import). Nothing awaits the hook, so without the rejection handler a
 * ChunkLoadError after a deploy surfaces only as an unhandled rejection and
 * the feature stays silently uninstalled.
 */
function runExtensionHook(extensionId: string, hook: () => unknown): void {
  try {
    const result = hook();
    if (result instanceof Promise) {
      result.catch((error: unknown) => logExtensionError(extensionId, error));
    }
  } catch (error) {
    logExtensionError(extensionId, error);
  }
}

/** Fans a lifecycle hook out to every loaded extension, in registry order. */
function notifyExtensions(
  extensions: ReadonlyArray<ExtensionDefinition>,
  deps: ExtensionRuntimeDeps,
  invoke: (mod: ExtensionModule, deps: ExtensionRuntimeDeps) => unknown,
): void {
  extensions.forEach((extension: ExtensionDefinition) => {
    const mod = loadedModules.get(extension.id);
    if (!mod) {
      return;
    }

    runExtensionHook(extension.id, () => invoke(mod, deps));
  });
}

function getStaticModule(
  extension: ExtensionDefinition,
): ExtensionModule | undefined {
  if (extension.loading === "static") {
    return extension.module;
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

function registerLoadedModule(
  extension: ExtensionDefinition,
  mod: ExtensionModule,
): ExtensionModule {
  const ExtensionComponent = mod.Component;
  if (ExtensionComponent && extension.metadata) {
    ReactElementFactory.Instance.registerElement(
      extension.metadata.name,
      (props) => <ExtensionComponent {...props} key={extension.id} />,
    );
  }

  loadedModules.set(extension.id, mod);
  return mod;
}

function initializeModule(
  extension: ExtensionDefinition,
  mod: ExtensionModule,
): ExtensionModule {
  mod.onInit?.();
  console.debug(`✓ [ExtensionLoader] Initialized extension: ${extension.id}`);
  return registerLoadedModule(extension, mod);
}

function initializeStaticExtensions(extensions: ExtensionDefinition[]) {
  extensions.forEach((extension) => {
    if (getLoadingMode(extension) !== "static") {
      return;
    }

    if (initializedExtensionIds.has(extension.id)) {
      return;
    }

    const mod = getStaticModule(extension);
    if (!mod) {
      return;
    }

    try {
      initializeModule(extension, mod);
      initializedExtensionIds.add(extension.id);
    } catch (error) {
      logExtensionError(extension.id, error);
    }
  });
}

export interface UseExtensionLoaderOptions {
  allExtensions: ReadonlyArray<ExtensionDefinition>;
  extensionIdsToLoad: string[];
  runtimeDeps: ExtensionRuntimeDeps;
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
      return initializeModule(ext, mod);
    } catch (error) {
      logExtensionError(ext.id, error);
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
  runtimeDeps,
}: UseExtensionLoaderOptions) {
  if (typeof runtimeDeps.getRuntimeState !== "function") {
    throw new TypeError(
      "useExtensionLoader requires runtimeDeps.getRuntimeState function.",
    );
  }

  const [isReady, setIsReady] = useState(false);
  const mountedRef = useRef(true);
  const runtimeDepsRef = useRef(runtimeDeps);
  runtimeDepsRef.current = runtimeDeps;

  const normalizedExtensionIds = useMemo(
    () =>
      Array.from(new Set(extensionIdsToLoad)).sort((a, b) =>
        a.localeCompare(b, "en", { sensitivity: "base" }),
      ),
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
    (model: Model) =>
      notifyExtensions(extensionsToLoad, runtimeDepsRef.current, (mod, deps) =>
        mod.onModelReady?.(model, deps),
      ),
    [extensionsToLoad],
  );

  const onCreatorCreated = useCallback(
    (creator: SurveyCreatorModel) =>
      notifyExtensions(extensionsToLoad, runtimeDepsRef.current, (mod, deps) =>
        mod.onCreatorReady?.(creator, deps),
      ),
    [extensionsToLoad],
  );

  return { isReady, onModelCreated, onCreatorCreated };
}
