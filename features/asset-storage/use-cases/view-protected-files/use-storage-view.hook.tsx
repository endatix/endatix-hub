"use client";

import { extractStorageUrls } from "@/features/asset-storage/utils";
import type { StorageReadRuntime } from "@/features/asset-storage/infrastructure/storage-read-runtime";
import { generateAssetsManifest } from "./generate-assets-manifest";
import { isCanonicalStorageObjectUrl } from "../../infrastructure/providers/shared/storage-url-parse";
import { useCallback, useMemo } from "react";
import { SurveyModel } from "survey-core";
import { SurveyModelWithTokens } from "../../types";
import { useAssetStorage } from "../../ui/asset-storage.context";

/** State for tracking prefetching of private read URLs. */
type PrefetchState = {
  completedKey: string;
  inflight: Promise<void> | null;
};

const prefetchStateByModel = new WeakMap<SurveyModel, PrefetchState>();

/** Collects unsigned URLs for prefetching. */
function collectUnsignedUrlsForPrefetch(urls: string[]): string[] {
  const unique = [...new Set(urls)];
  return unique.filter((url) => isCanonicalStorageObjectUrl(url));
}

const privateModelReadTokens = {
  userFiles: null,
  content: null,
} as const;

export interface UseStorageViewOptions {
  getReadRuntime: () => StorageReadRuntime | null;
}

/**
 * Handles viewing protected files from storage (presigned GET URLs via batch queue).
 */
export function useStorageView({ getReadRuntime }: UseStorageViewOptions) {
  const { config: storageConfig, enqueuePrivateReadUrls } = useAssetStorage();

  const tokens = useMemo(() => privateModelReadTokens, []);

  const setModelMetadata = useCallback(
    (model: SurveyModel) => {
      if (storageConfig?.isPrivate) {
        (model as SurveyModelWithTokens).readTokens = tokens;
      }
    },
    [storageConfig?.isPrivate, tokens],
  );

  const prefetchPrivateReadUrlsForModel = useCallback(
    async (model: SurveyModel) => {
      if (
        !storageConfig?.isEnabled ||
        !storageConfig.isPrivate ||
        !storageConfig.hostName
      ) {
        return;
      }

      const hostLower = storageConfig.hostName.toLowerCase();
      const fromData = extractStorageUrls(
        JSON.stringify(model.data ?? {}),
        storageConfig.hostName,
      );
      const fromManifest = generateAssetsManifest(model).filter((url) => {
        try {
          return new URL(url).host.toLowerCase() === hostLower;
        } catch {
          return false;
        }
      });
      const urls = collectUnsignedUrlsForPrefetch([
        ...new Set([...fromData, ...fromManifest]),
      ]);

      if (urls.length === 0) {
        return;
      }

      const prefetchKey = urls.slice().sort().join("\0");
      const existing = prefetchStateByModel.get(model);

      if (existing?.completedKey === prefetchKey) {
        return;
      }
      
      if (existing?.inflight) {
        await existing.inflight;
        return;
      }

      const runtime = getReadRuntime();
      const inflight = (async (): Promise<void> => {
        await enqueuePrivateReadUrls(urls, runtime);
      })();

      prefetchStateByModel.set(model, { completedKey: prefetchKey, inflight });
      try {
        await inflight;
        prefetchStateByModel.set(model, {
          completedKey: prefetchKey,
          inflight: null,
        });
      } catch (error) {
        prefetchStateByModel.delete(model);
        throw error;
      }
    },
    [storageConfig, enqueuePrivateReadUrls, getReadRuntime],
  );

  return {
    setModelMetadata,
    prefetchPrivateReadUrlsForModel,
  };
}
