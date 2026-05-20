import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React, { Suspense } from "react";
import { useStorageView } from "@/features/asset-storage/client";
import { SurveyModel } from "survey-core";
import { AssetStorageClientProvider } from "@/features/asset-storage/client";
import type { ClientStorageConfig } from "@endatix/storage-azure";
import { clientStorageConfig } from "../../test-storage-config";
import { READ_URL_FLUSH_DEBOUNCE_MS } from "../../../application/read-url-queue";

vi.mock("../../../infrastructure/fetch-storage-read-urls", () => ({
  fetchStorageReadUrls: vi.fn(),
}));

import { fetchStorageReadUrls } from "../../../infrastructure/fetch-storage-read-urls";

const mockStorageConfig: ClientStorageConfig = clientStorageConfig({
  isPrivate: true,
});

const mockGetReadRuntime = () => ({
  plane: "hub" as const,
  formId: "form-1",
});

describe("useStorageView", () => {
  const mockSurveyModel = {
    locale: "en",
    locLogo: {
      renderedHtml:
        "https://testaccount.blob.core.windows.net/content/logo.png",
    },
  } as unknown as SurveyModel;

  const createWrapper = (
    config: ClientStorageConfig | null = mockStorageConfig,
  ) => {
    function TestWrapper({ children }: { children: React.ReactNode }) {
      return (
        <Suspense fallback={<div>Loading...</div>}>
          <AssetStorageClientProvider config={config}>
            {children}
          </AssetStorageClientProvider>
        </Suspense>
      );
    }
    return TestWrapper;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("hook initialization", () => {
    it("should initialize and return setModelMetadata and prefetchPrivateReadUrlsForModel", async () => {
      let result: ReturnType<typeof renderHook>["result"];

      await act(async () => {
        const view = renderHook(
          () => useStorageView({ getReadRuntime: mockGetReadRuntime }),
          {
            wrapper: createWrapper(mockStorageConfig),
          },
        );
        result = view.result;
        await Promise.resolve();
      });

      const hookResult = result!.current as ReturnType<typeof useStorageView>;
      expect(hookResult).not.toBeNull();
      expect(hookResult.setModelMetadata).toBeDefined();
      expect(hookResult.prefetchPrivateReadUrlsForModel).toBeDefined();
    });
  });

  describe("setModelMetadata", () => {
    it("should set readTokens placeholder when storage is private", async () => {
      let result: ReturnType<typeof renderHook>["result"];

      await act(async () => {
        const view = renderHook(
          () => useStorageView({ getReadRuntime: mockGetReadRuntime }),
          {
            wrapper: createWrapper(mockStorageConfig),
          },
        );
        result = view.result;
        await Promise.resolve();
      });

      const model = { ...mockSurveyModel } as SurveyModel;
      const hookResult = result!.current as ReturnType<typeof useStorageView>;
      hookResult.setModelMetadata(model);

      expect((model as { readTokens?: unknown }).readTokens).toEqual({
        userFiles: null,
        content: null,
      });
    });

    it("should not set metadata when storage is not private", async () => {
      const publicConfig = { ...mockStorageConfig, isPrivate: false };
      let result: ReturnType<typeof renderHook>["result"];

      await act(async () => {
        const view = renderHook(
          () => useStorageView({ getReadRuntime: mockGetReadRuntime }),
          {
            wrapper: createWrapper(publicConfig),
          },
        );
        result = view.result;
        await Promise.resolve();
      });

      const model = { ...mockSurveyModel } as SurveyModel;
      const hookResult = result!.current as ReturnType<typeof useStorageView>;
      hookResult.setModelMetadata(model);

      expect((model as { readTokens?: unknown }).readTokens).toBeUndefined();
    });
  });

  describe("prefetchPrivateReadUrlsForModel", () => {
    it("lets the queue skip cached URLs across models", async () => {
      vi.useFakeTimers();
      const blobUrl =
        "https://testaccount.blob.core.windows.net/content/logo.png";
      const presigned = `${blobUrl}?sig=from-read-urls`;
      vi.mocked(fetchStorageReadUrls).mockResolvedValue({
        resolved: { [blobUrl]: { url: presigned } },
      });

      const { result } = renderHook(
        () => useStorageView({ getReadRuntime: mockGetReadRuntime }),
        {
          wrapper: createWrapper(mockStorageConfig),
        },
      );

      const firstModel = new SurveyModel({});
      firstModel.data = { logo: blobUrl };
      const secondModel = new SurveyModel({});
      secondModel.data = { logo: blobUrl };

      await act(async () => {
        const pending =
          result.current.prefetchPrivateReadUrlsForModel(firstModel);
        await vi.advanceTimersByTimeAsync(READ_URL_FLUSH_DEBOUNCE_MS);
        await pending;
      });

      await act(async () => {
        await result.current.prefetchPrivateReadUrlsForModel(secondModel);
        await vi.advanceTimersByTimeAsync(READ_URL_FLUSH_DEBOUNCE_MS);
      });

      expect(fetchStorageReadUrls).toHaveBeenCalledTimes(1);
    });
  });
});
