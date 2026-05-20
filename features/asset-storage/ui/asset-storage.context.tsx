"use client";

import type { ClientStorageConfig } from "@endatix/storage-azure";
import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PrivateReadUrlBatchQueue } from "../application/read-url-queue";
import { registerProtectedFileItem } from "../use-cases/view-protected-files/ui/protected-file-item";
import { registerProtectedFilePreview } from "../use-cases/view-protected-files/ui/protected-file-preview";
import { registerProtectedImages } from "../use-cases/view-protected-files/ui/protected-image";
import { registerProtectedImageItem } from "../use-cases/view-protected-files/ui/protected-image-item";
import { registerProtectedLogoImage } from "../use-cases/view-protected-files/ui/protected-logo-image";
import { registerProtectedSignaturePad } from "../use-cases/view-protected-files/ui/protected-singaturepad";
import { fetchStorageReadUrls } from "../infrastructure/fetch-storage-read-urls";
import type { StorageReadRuntime } from "../infrastructure/fetch-storage-read-urls";

export interface AssetStorageContextValue {
  config: ClientStorageConfig | null;
  /**
   * Batches private read-url resolution (debounced). Prefer over direct fetchStorageReadUrls.
   */
  enqueuePrivateReadUrls: (
    urls: string[],
    runtime: StorageReadRuntime | null,
  ) => Promise<Map<string, string | null>>;
  /** Merges presigned GET URLs (e.g. external batch results). */
  mergePrivateReadUrlCache: (entries: Record<string, string>) => void;
  getCachedPrivateReadUrl: (url: string) => string | null;
  /** Bumped when the private read-url cache gains new raw keys. */
  readUrlCacheVersion: number;
}

export const AssetStorageContext = createContext<
  AssetStorageContextValue | undefined
>(undefined);

interface AssetStorageClientProviderProps {
  children: React.ReactNode;
  config: ClientStorageConfig | Promise<ClientStorageConfig> | null;
}

function mergeIntoReadUrlCacheRef(
  cacheRef: React.RefObject<Record<string, string>>,
  entries: Record<string, string>,
  bumpVersion: () => void,
): void {
  if (Object.keys(entries).length === 0) {
    return;
  }

  const cache = cacheRef.current;
  let hasNew = false;
  for (const [rawUrl, presigned] of Object.entries(entries)) {
    if (presigned.length === 0) {
      continue;
    }
    if (!(rawUrl in cache)) {
      cache[rawUrl] = presigned;
      hasNew = true;
    } else if (cache[rawUrl] !== presigned) {
      cache[rawUrl] = presigned;
    }
  }
  if (hasNew) {
    bumpVersion();
  }
}

/**
 * Client-side provider for Asset Storage.
 * Private storage: presigned GET URLs via batched POST read-urls ({@link enqueuePrivateReadUrls}).
 */
export function AssetStorageClientProvider({
  children,
  config,
}: Readonly<AssetStorageClientProviderProps>) {
  const resolvedConfig = config instanceof Promise ? use(config) : config;

  useEffect(() => {
    if (!resolvedConfig?.isPrivate) {
      return;
    }
    
    registerProtectedFilePreview();
    registerProtectedImages();
    registerProtectedLogoImage();
    registerProtectedSignaturePad();
    registerProtectedImageItem();
    registerProtectedFileItem();
  }, [resolvedConfig?.isPrivate]);

  const cacheRef = useRef<Record<string, string>>({});
  const [readUrlCacheVersion, setReadUrlCacheVersion] = useState(0);

  const bumpReadUrlCacheVersion = useCallback(() => {
    setReadUrlCacheVersion((version) => version + 1);
  }, []);

  const queueRef = useRef<PrivateReadUrlBatchQueue | null>(null);
  if (queueRef.current === null) {
    queueRef.current = new PrivateReadUrlBatchQueue({
      getCache: () => cacheRef.current,
      fetchBatch: fetchStorageReadUrls,
      onBatchResolved: (entries) => {
        mergeIntoReadUrlCacheRef(cacheRef, entries, bumpReadUrlCacheVersion);
      },
    });
  }

  const mergePrivateReadUrlCache = useCallback(
    (entries: Record<string, string>) => {
      mergeIntoReadUrlCacheRef(cacheRef, entries, bumpReadUrlCacheVersion);
    },
    [bumpReadUrlCacheVersion],
  );

  const enqueuePrivateReadUrls = useCallback(
    (urls: string[], runtime: StorageReadRuntime | null) => {
      return queueRef.current!.enqueue(urls, runtime);
    },
    [],
  );

  const getCachedPrivateReadUrl = useCallback(
    (url: string) => {
      if (!resolvedConfig?.isEnabled || !resolvedConfig?.isPrivate || !url) {
        return null;
      }

      if (url.startsWith("data:")) {
        return null;
      }

      const cached = cacheRef.current[url];
      if (cached !== undefined && cached.length > 0) {
        return cached;
      }

      return null;
    },
    [resolvedConfig],
  );

  const contextVal = useMemo(
    () => ({
      config: resolvedConfig,
      enqueuePrivateReadUrls,
      mergePrivateReadUrlCache,
      getCachedPrivateReadUrl,
      readUrlCacheVersion,
    }),
    [
      resolvedConfig,
      enqueuePrivateReadUrls,
      mergePrivateReadUrlCache,
      getCachedPrivateReadUrl,
      readUrlCacheVersion,
    ],
  );

  return (
    <AssetStorageContext value={contextVal}>{children}</AssetStorageContext>
  );
}

export function useAssetStorage(): AssetStorageContextValue {
  const context = use(AssetStorageContext);

  if (!context) {
    throw new Error(
      "useAssetStorage must be used within an AssetStorageProvider. " +
        "Wrap your component tree with <AssetStorageProvider>.",
    );
  }

  return context;
}
