import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React, { Suspense } from "react";
import { SurveyCreatorModel } from "survey-creator-core";
import { useStorageWithCreator } from "@/features/asset-storage/client";
import { AssetStorageClientProvider } from "@/features/asset-storage/client";
import { ClientStorageConfig } from "@/features/asset-storage/client";
import { clientStorageConfig } from "../../test-storage-config";

// Mock the hooks
const mockRegisterUploadHandlers = vi.fn();
const mockPrefetchPrivateReadUrlsForModel = vi
  .fn()
  .mockResolvedValue(undefined);
const { mockRegisterStorageOnlyFileModeGlobals, mockBindStorageOnlyFileModeToCreator } =
  vi.hoisted(() => ({
    mockRegisterStorageOnlyFileModeGlobals: vi.fn(),
    mockBindStorageOnlyFileModeToCreator: vi.fn(),
  }));

vi.mock(
  "@/features/asset-storage/use-cases/upload-content-files/use-content-upload.hook",
  () => ({
    useContentUpload: () => ({
      registerUploadHandlers: mockRegisterUploadHandlers,
    }),
  }),
);

vi.mock(
  "@/features/asset-storage/use-cases/view-protected-files/use-storage-view.hook",
  () => ({
    useStorageView: () => ({
      prefetchPrivateReadUrlsForModel: mockPrefetchPrivateReadUrlsForModel,
    }),
  }),
);

vi.mock("@/lib/survey-features/storage-only-file-mode", () => ({
  registerStorageOnlyFileModeGlobals: mockRegisterStorageOnlyFileModeGlobals,
  bindStorageOnlyFileModeToCreator: mockBindStorageOnlyFileModeToCreator,
}));

const createMockSurveyModel = () =>
  ({
    render: vi.fn(),
  }) as unknown as import("survey-core").SurveyModel;

const createMockCreatorModel = (): SurveyCreatorModel => {
  return {
    survey: createMockSurveyModel(),
    onActiveTabChanged: { add: vi.fn(), remove: vi.fn() },
    onSurveyInstanceCreated: { add: vi.fn(), remove: vi.fn() },
  } as unknown as SurveyCreatorModel;
};

describe("useStorageWithCreator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterUploadHandlers.mockReturnValue(() => {});
    mockPrefetchPrivateReadUrlsForModel.mockResolvedValue(undefined);
    mockBindStorageOnlyFileModeToCreator.mockReturnValue(vi.fn());
  });

  const wrapper = (config: ClientStorageConfig | null) => {
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

  it("should handle disabled storage", async () => {
    const disabledConfig: ClientStorageConfig = clientStorageConfig({
      isEnabled: false,
      isPrivate: false,
    });

    const creator = createMockCreatorModel();
    let result: { current: ReturnType<typeof useStorageWithCreator> };
    await act(async () => {
      const view = renderHook(
        () =>
          useStorageWithCreator({
            itemId: "test-item",
            itemType: "form",
          }),
        {
          wrapper: wrapper(disabledConfig),
        },
      );
      result = view.result;
      await Promise.resolve();
    });

    expect(result!.current.registerStorageHandlers).toBeDefined();

    let unregister: () => void = () => {};
    act(() => {
      unregister = result!.current.registerStorageHandlers(creator);
    });
    expect(mockRegisterUploadHandlers).not.toHaveBeenCalled();
    expect(mockRegisterStorageOnlyFileModeGlobals).not.toHaveBeenCalled();
    expect(mockBindStorageOnlyFileModeToCreator).not.toHaveBeenCalled();
    unregister();
  });

  it("should register upload handlers when enabled and not private", async () => {
    const publicConfig: ClientStorageConfig = clientStorageConfig({
      isEnabled: true,
      isPrivate: false,
    });

    const creator = createMockCreatorModel();
    let result: { current: ReturnType<typeof useStorageWithCreator> };
    await act(async () => {
      const view = renderHook(
        () =>
          useStorageWithCreator({
            itemId: "test-item",
            itemType: "form",
          }),
        {
          wrapper: wrapper(publicConfig),
        },
      );
      result = view.result;
      await Promise.resolve();
    });

    let unregister: () => void = () => {};
    act(() => {
      unregister = result!.current.registerStorageHandlers(creator);
    });
    expect(mockRegisterUploadHandlers).toHaveBeenCalledWith(creator);
    expect(mockRegisterStorageOnlyFileModeGlobals).toHaveBeenCalledTimes(1);
    expect(mockBindStorageOnlyFileModeToCreator).toHaveBeenCalledWith(creator);

    const unbindStorageOnlyFileMode =
      mockBindStorageOnlyFileModeToCreator.mock.results[0]?.value;
    unregister();
    expect(unbindStorageOnlyFileMode).toHaveBeenCalledTimes(1);
  });

  it("should register upload handlers when private", async () => {
    const privateConfig: ClientStorageConfig = clientStorageConfig({
      isEnabled: true,
      isPrivate: true,
    });

    const creator = createMockCreatorModel();
    let result: { current: ReturnType<typeof useStorageWithCreator> };
    await act(async () => {
      const view = renderHook(
        () =>
          useStorageWithCreator({
            itemId: "test-item",
            itemType: "form",
          }),
        {
          wrapper: wrapper(privateConfig),
        },
      );
      result = view.result;
      await Promise.resolve();
    });

    let unregister: () => void = () => {};
    act(() => {
      unregister = result!.current.registerStorageHandlers(creator);
    });
    expect(mockRegisterUploadHandlers).toHaveBeenCalledWith(creator);
    expect(mockPrefetchPrivateReadUrlsForModel).toHaveBeenCalled();
    unregister();
  });
});
