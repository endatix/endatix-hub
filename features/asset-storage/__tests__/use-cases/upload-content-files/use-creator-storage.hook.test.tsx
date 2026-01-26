import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React, { Suspense } from "react";
import { SurveyCreatorModel } from "survey-creator-core";
import { useStorageWithCreator } from "@/features/asset-storage/client";
import { Result } from "@/lib/result";
import { ContainerReadToken } from "@/features/asset-storage/types";
import { AssetStorageClientProvider } from "@/features/asset-storage/client";
import { StorageConfig } from "@/features/asset-storage/client";

// Mock the hooks
const mockRegisterUploadHandlers = vi.fn();

vi.mock(
  "@/features/asset-storage/use-cases/upload-content-files/use-content-upload.hook",
  () => ({
    useContentUpload: () => ({
      registerUploadHandlers: mockRegisterUploadHandlers,
    }),
  }),
);

const createMockCreatorModel = (): SurveyCreatorModel => {
  return {} as unknown as SurveyCreatorModel;
};

const createReadTokenPromises = () => {
  const resolvedTokenResult = Result.success<ContainerReadToken>({
    token: "test-token-123",
    containerName: "content",
    expiresOn: new Date(),
    generatedAt: new Date(),
  });

  const resolvedUserFilesTokenResult = Result.success<ContainerReadToken>({
    token: "user-files-token-456",
    containerName: "user-files",
    expiresOn: new Date(),
    generatedAt: new Date(),
  });

  return {
    userFiles: Promise.resolve(resolvedUserFilesTokenResult),
    content: Promise.resolve(resolvedTokenResult),
  };
};

describe("useStorageWithCreator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterUploadHandlers.mockReturnValue(() => { });
  });

  const wrapper = (config: StorageConfig | null) => {
    function TestStorageConfigWrapper({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return (
        <Suspense fallback={<div>Loading...</div>}>
          <AssetStorageClientProvider config={config}>
            {children}
          </AssetStorageClientProvider>
        </Suspense>
      );
    }
    return TestStorageConfigWrapper;
  };

  it("should return registerStorageHandlers function", async () => {
    const { result } = renderHook(
      () =>
        useStorageWithCreator({
          itemId: "test-item",
          itemType: "form",
        }),
      {
        wrapper: wrapper(null),
      },
    );

    expect(result.current.registerStorageHandlers).toBeDefined();
    expect(result.current.isStorageReady).toBe(false);
  });

  describe("when readTokenPromises is provided", () => {
    const readTokenPromises = createReadTokenPromises();

    it("should handle disabled storage", async () => {
      const disabledConfig: StorageConfig = {
        isEnabled: false,
        isPrivate: false,
        protocol: "https",
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      const creator = createMockCreatorModel();
      let result: any;
      await act(async () => {
        const view = renderHook(
          () =>
            useStorageWithCreator({
              itemId: "test-item",
              itemType: "form",
              readTokenPromises,
            }),
          {
            wrapper: wrapper(disabledConfig),
          },
        );
        result = view.result;
        await Promise.resolve();
      });

      expect(result.current.registerStorageHandlers).toBeDefined();

      let unregister: () => void = () => { };
      act(() => {
        unregister = result.current.registerStorageHandlers(creator);
      });
      expect(mockRegisterUploadHandlers).not.toHaveBeenCalled();
      unregister();
    });

    it("should register upload handlers but not view handlers when not private", async () => {
      const publicConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: false,
        protocol: "https",
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      const creator = createMockCreatorModel();
      let result: any;
      await act(async () => {
        const view = renderHook(
          () =>
            useStorageWithCreator({
              itemId: "test-item",
              itemType: "form",
              readTokenPromises,
            }),
          {
            wrapper: wrapper(publicConfig),
          },
        );
        result = view.result;
        await Promise.resolve();
      });

      let unregister: () => void = () => { };
      act(() => {
        unregister = result.current.registerStorageHandlers(creator);
      });
      expect(mockRegisterUploadHandlers).toHaveBeenCalledWith(creator);
      unregister();
    });

    it("should register both upload and view handlers when private", async () => {
      const privateConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: true,
        protocol: "https",
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      const creator = createMockCreatorModel();
      let result: any;
      await act(async () => {
        const view = renderHook(
          () =>
            useStorageWithCreator({
              itemId: "test-item",
              itemType: "form",
              readTokenPromises,
            }),
          {
            wrapper: wrapper(privateConfig),
          },
        );
        result = view.result;
        await Promise.resolve();
      });

      let unregister: () => void = () => { };
      act(() => {
        unregister = result.current.registerStorageHandlers(creator);
      });
      expect(mockRegisterUploadHandlers).toHaveBeenCalledWith(creator);
      unregister();
    });
  });
});
