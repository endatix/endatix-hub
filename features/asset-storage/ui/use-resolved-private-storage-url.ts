"use client";

import { isCanonicalStorageObjectUrl } from "../utils";
import { useEffect, useMemo, useState } from "react";
import { useAssetStorage } from "./asset-storage.context";
import { useStorageReadRuntime } from "./use-storage-read-runtime";

export type PrivateStorageDisplayUrlResult = {
  displayUrl: string;
  isResolving: boolean;
};

export type UsePrivateStorageDisplayUrlOptions = {
  /** When false, skips presign until enabled (viewport lazy load). */
  enabled?: boolean;
};

function usePrivateStorageDisplayUrlAsync(
  rawUrl: string | undefined,
  enabled: boolean,
): PrivateStorageDisplayUrlResult {
  const { config, getCachedPrivateReadUrl, enqueuePrivateReadUrls } =
    useAssetStorage();
  const getReadRuntime = useStorageReadRuntime();
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setResolved(null);
      return;
    }

    const url = rawUrl ?? "";
    if (url.length === 0) {
      setResolved("");
      return;
    }

    if (!config?.isEnabled || !config?.isPrivate) {
      setResolved(url);
      return;
    }

    const fromCache = getCachedPrivateReadUrl(url);
    if (fromCache !== null) {
      setResolved(fromCache);
      return;
    }

    let cancelled = false;

    void (async () => {
      const batch = await enqueuePrivateReadUrls([url], getReadRuntime());
      if (cancelled) {
        return;
      }
      const presigned = batch.get(url) ?? null;
      if (presigned !== null && presigned.length > 0) {
        setResolved(presigned);
      } else {
        setResolved("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    rawUrl,
    config?.isEnabled,
    config?.isPrivate,
    getCachedPrivateReadUrl,
    enqueuePrivateReadUrls,
    getReadRuntime,
  ]);

  const isResolving = resolved === null;
  return {
    displayUrl: resolved ?? "",
    isResolving,
  };
}

/**
 * Resolves a storage object URL for display: sync cache first, then per-URL read-urls.
 * Never returns an unsigned private blob URL while resolution is in progress.
 */
export function usePrivateStorageDisplayUrl(
  rawUrl: string | undefined,
  options?: UsePrivateStorageDisplayUrlOptions,
): PrivateStorageDisplayUrlResult {
  const enabled = options?.enabled ?? true;
  const { config, getCachedPrivateReadUrl } = useAssetStorage();
  const raw = rawUrl ?? "";

  const needsResolve = useMemo(() => {
    if (
      raw.length === 0 ||
      raw.startsWith("data:") ||
      !raw.startsWith("http")
    ) {
      return false;
    }
    if (!config?.isEnabled || !config?.isPrivate) {
      return false;
    }
    return isCanonicalStorageObjectUrl(raw);
  }, [raw, config?.isEnabled, config?.isPrivate]);

  const cachedUrl = useMemo(() => {
    return needsResolve ? getCachedPrivateReadUrl(raw) : null;
  }, [needsResolve, getCachedPrivateReadUrl, raw]);

  const asyncTarget = needsResolve && cachedUrl === null ? raw : undefined;
  const asyncResult = usePrivateStorageDisplayUrlAsync(asyncTarget, enabled);

  if (!enabled) {
    return { displayUrl: "", isResolving: true };
  }
  if (!needsResolve) {
    return { displayUrl: raw, isResolving: false };
  }
  if (cachedUrl !== null && cachedUrl.length > 0) {
    return { displayUrl: cachedUrl, isResolving: false };
  }
  return asyncResult;
}
