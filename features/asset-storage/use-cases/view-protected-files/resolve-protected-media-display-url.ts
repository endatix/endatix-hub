import type { StorageReadRuntime } from "../../infrastructure/fetch-storage-read-urls";
import { isCanonicalStorageObjectUrl } from "../../infrastructure/providers/shared/storage-url-parse";
import type { AssetStorageContextValue } from "../../ui/asset-storage.context";

/**
 * Resolves a private storage media URL for display (cache → batched read-urls queue).
 */
export async function resolveProtectedMediaDisplayUrl(
  rawUrl: string,
  storageContext: AssetStorageContextValue,
  runtime: StorageReadRuntime | null,
): Promise<string | null> {
  if (rawUrl.length === 0) {
    return null;
  }

  if (!isCanonicalStorageObjectUrl(rawUrl)) {
    return rawUrl;
  }

  const cached = storageContext.getCachedPrivateReadUrl(rawUrl);
  if (cached !== null) {
    return cached;
  }

  const resolved = await storageContext.enqueuePrivateReadUrls(
    [rawUrl],
    runtime,
  );
  
  return resolved.get(rawUrl) ?? null;
}
