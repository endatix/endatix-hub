import { act, renderHook } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { READ_URL_FLUSH_DEBOUNCE_MS } from "../../application/read-url-queue";
import { AssetStorageClientProvider } from "../../ui/asset-storage.context";
import { usePrivateStorageDisplayUrl } from "../../ui/use-resolved-private-storage-url";
import { clientStorageConfig } from "../test-storage-config";

vi.mock("../../infrastructure/fetch-storage-read-urls", () => ({
  fetchStorageReadUrls: vi.fn(),
}));

import { fetchStorageReadUrls } from "../../infrastructure/fetch-storage-read-urls";

const blobUrl =
  "https://testaccount.blob.core.windows.net/user-files/s/f1/s1/photo.jpg";

function wrapperFor(isPrivate: boolean) {
  const config = clientStorageConfig({ isPrivate });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AssetStorageClientProvider config={config}>
        {children}
      </AssetStorageClientProvider>
    );
  };
}

describe("usePrivateStorageDisplayUrl refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("signs the URL again after refresh (expired read token)", async () => {
    vi.mocked(fetchStorageReadUrls)
      .mockResolvedValueOnce({
        resolved: { [blobUrl]: { url: `${blobUrl}?sig=first` } },
      })
      .mockResolvedValueOnce({
        resolved: { [blobUrl]: { url: `${blobUrl}?sig=second` } },
      });

    const { result } = renderHook(() => usePrivateStorageDisplayUrl(blobUrl), {
      wrapper: wrapperFor(true),
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(READ_URL_FLUSH_DEBOUNCE_MS);
    });
    expect(result.current.displayUrl).toBe(`${blobUrl}?sig=first`);

    act(() => {
      result.current.refresh();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(READ_URL_FLUSH_DEBOUNCE_MS);
    });

    expect(result.current.displayUrl).toBe(`${blobUrl}?sig=second`);
    expect(fetchStorageReadUrls).toHaveBeenCalledTimes(2);
  });

  it("does nothing for public storage", async () => {
    const { result } = renderHook(() => usePrivateStorageDisplayUrl(blobUrl), {
      wrapper: wrapperFor(false),
    });

    act(() => {
      result.current.refresh();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(READ_URL_FLUSH_DEBOUNCE_MS);
    });

    expect(result.current.displayUrl).toBe(blobUrl);
    expect(fetchStorageReadUrls).not.toHaveBeenCalled();
  });
});
