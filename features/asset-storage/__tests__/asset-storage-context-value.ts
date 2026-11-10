import { vi } from "vitest";
import type { AssetStorageContextValue } from "@/features/asset-storage/ui/asset-storage.context";

type Ctx = AssetStorageContextValue;

/** Complete AssetStorageContextValue for tests; pass only the members a test exercises. */
export function createAssetStorageContextValue(
  overrides: Partial<Ctx> = {},
): Ctx {
  return {
    config: null,
    enqueuePrivateReadUrls: vi.fn<Ctx["enqueuePrivateReadUrls"]>(),
    mergePrivateReadUrlCache: vi.fn<Ctx["mergePrivateReadUrlCache"]>(),
    getCachedPrivateReadUrl: vi.fn<Ctx["getCachedPrivateReadUrl"]>(() => null),
    evictPrivateReadUrl: vi.fn<Ctx["evictPrivateReadUrl"]>(),
    readUrlCacheVersion: 0,
    ...overrides,
  };
}
