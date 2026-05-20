import { act, renderHook } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { ClientStorageConfig } from "@endatix/storage-azure";
import { IMAGE_SERVICE_CONFIG } from "../../infrastructure/image-service";
import {
  AssetStorageClientProvider,
  useAssetStorage,
} from "../../ui/asset-storage.context";

vi.mock("../../infrastructure/fetch-storage-read-urls", () => ({
  fetchStorageReadUrls: vi.fn(),
}));

import { fetchStorageReadUrls } from "../../infrastructure/fetch-storage-read-urls";
import { READ_URL_FLUSH_DEBOUNCE_MS } from "../../application/read-url-queue";

const mockStorageConfig: ClientStorageConfig = {
  isEnabled: true,
  isPrivate: true,
  hostName: "testaccount.blob.core.windows.net",
  protocol: "https",
  containerNames: {
    USER_FILES: "user-files",
    CONTENT: "content",
  },
  imageConfig: IMAGE_SERVICE_CONFIG,
};

describe("AssetStorageClientProvider enqueuePrivateReadUrls", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates cached private read URL after batch flush and bumps version only for new keys", async () => {
    const blobUrl =
      "https://testaccount.blob.core.windows.net/content/folder/file.jpg";
    const presigned = `${blobUrl}?sig=from-read-urls`;

    vi.mocked(fetchStorageReadUrls).mockResolvedValue({
      resolved: { [blobUrl]: { url: presigned } },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AssetStorageClientProvider config={mockStorageConfig}>
        {children}
      </AssetStorageClientProvider>
    );

    const { result } = renderHook(() => useAssetStorage(), { wrapper });

    expect(result.current.getCachedPrivateReadUrl(blobUrl)).toBeNull();
    const versionBefore = result.current.readUrlCacheVersion;

    await act(async () => {
      const pending = result.current.enqueuePrivateReadUrls([blobUrl], {
        policyName: "hub",
        formId: "f1",
      });
      await vi.advanceTimersByTimeAsync(READ_URL_FLUSH_DEBOUNCE_MS);
      await pending;
    });

    expect(result.current.getCachedPrivateReadUrl(blobUrl)).toBe(presigned);
    expect(result.current.readUrlCacheVersion).toBe(versionBefore + 1);

    await act(async () => {
      await result.current.enqueuePrivateReadUrls([blobUrl], {
        policyName: "hub",
        formId: "f1",
      });
      await vi.advanceTimersByTimeAsync(READ_URL_FLUSH_DEBOUNCE_MS);
    });

    expect(fetchStorageReadUrls).toHaveBeenCalledTimes(1);
    expect(result.current.readUrlCacheVersion).toBe(versionBefore + 1);
  });
});
