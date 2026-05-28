import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React, { Suspense } from "react";
import { SurveyModel } from "survey-core";
import { useStorageWithSurvey } from "@/features/asset-storage/client";
import { AssetStorageClientProvider } from "@/features/asset-storage/client";
import { ClientStorageConfig } from "@/features/asset-storage/client";
import { clientStorageConfig } from "../../test-storage-config";

// Mock the hooks
const mockSetModelMetadata = vi.fn();
const mockRegisterUploadHandlers = vi.fn();
const mockPrefetchPrivateReadUrlsForModel = vi
  .fn()
  .mockResolvedValue(undefined);

vi.mock(
  "@/features/asset-storage/use-cases/view-protected-files/use-storage-view.hook",
  () => ({
    useStorageView: () => ({
      setModelMetadata: mockSetModelMetadata,
      prefetchPrivateReadUrlsForModel: mockPrefetchPrivateReadUrlsForModel,
    }),
  }),
);

vi.mock(
  "@/features/asset-storage/use-cases/upload-user-files/use-storage-upload.hook",
  () => ({
    useStorageUpload: () => ({
      registerUploadHandlers: mockRegisterUploadHandlers,
    }),
  }),
);

const createMockSurveyModel = (): SurveyModel => {
  return {
    readTokens: null,
  } as unknown as SurveyModel;
};

describe("useSurveyStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterUploadHandlers.mockReturnValue(() => {});
    mockPrefetchPrivateReadUrlsForModel.mockResolvedValue(undefined);
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

  it("should return registerStorageHandlers and set model metadata", () => {
    const model = createMockSurveyModel();
    const { result } = renderHook(
      () =>
        useStorageWithSurvey({
          model,
          formId: "test-form",
        }),
      {
        wrapper: wrapper(null),
      },
    );

    expect(result.current.registerStorageHandlers).toBeDefined();
    expect(mockSetModelMetadata).toHaveBeenCalledWith(model);

    let unregister: () => void = () => {};
    act(() => {
      unregister = result.current.registerStorageHandlers(model);
    });
    expect(mockRegisterUploadHandlers).not.toHaveBeenCalled();
    unregister();
  });

  it("should handle disabled storage", async () => {
    const disabledConfig: ClientStorageConfig = clientStorageConfig({
      isEnabled: false,
      isPrivate: false,
    });

    const model = createMockSurveyModel();
    let result: { current: ReturnType<typeof useStorageWithSurvey> };
    await act(async () => {
      const view = renderHook(
        () =>
          useStorageWithSurvey({
            model,
            formId: "test-form",
          }),
        {
          wrapper: wrapper(disabledConfig),
        },
      );
      result = view.result;
      await Promise.resolve();
    });

    expect(result!.current.registerStorageHandlers).toBeDefined();
    expect(mockSetModelMetadata).toHaveBeenCalledWith(model);

    let unregister: () => void = () => {};
    act(() => {
      unregister = result!.current.registerStorageHandlers(model);
    });
    expect(mockRegisterUploadHandlers).not.toHaveBeenCalled();
    unregister();
  });

  it("should register upload handlers but not view handlers when not private", async () => {
    const publicConfig: ClientStorageConfig = clientStorageConfig({
      isEnabled: true,
      isPrivate: false,
    });

    const model = createMockSurveyModel();
    let result: { current: ReturnType<typeof useStorageWithSurvey> };
    await act(async () => {
      const view = renderHook(
        () =>
          useStorageWithSurvey({
            model,
            formId: "test-form",
          }),
        {
          wrapper: wrapper(publicConfig),
        },
      );
      result = view.result;
      await Promise.resolve();
    });

    expect(mockSetModelMetadata).toHaveBeenCalledWith(model);

    let unregister: () => void = () => {};
    act(() => {
      unregister = result!.current.registerStorageHandlers(model);
    });
    expect(mockRegisterUploadHandlers).toHaveBeenCalledWith(model);
    unregister();
  });

  it("should register upload handlers when private", async () => {
    const privateConfig: ClientStorageConfig = clientStorageConfig({
      isEnabled: true,
      isPrivate: true,
    });

    const model = createMockSurveyModel();
    let result: { current: ReturnType<typeof useStorageWithSurvey> };
    await act(async () => {
      const view = renderHook(
        () =>
          useStorageWithSurvey({
            model,
            formId: "test-form",
          }),
        {
          wrapper: wrapper(privateConfig),
        },
      );
      result = view.result;
      await Promise.resolve();
    });

    expect(mockSetModelMetadata).toHaveBeenCalledWith(model);

    let unregister: () => void = () => {};
    act(() => {
      unregister = result!.current.registerStorageHandlers(model);
    });
    expect(mockRegisterUploadHandlers).toHaveBeenCalledWith(model);
    expect(result!.current.isStorageReady).toBe(true);
    unregister();
  });

  it("should return a combined cleanup function", async () => {
    const privateConfig: ClientStorageConfig = clientStorageConfig({
      isEnabled: true,
      isPrivate: true,
    });

    const model = createMockSurveyModel();
    const unregisterUpload = vi.fn();
    mockRegisterUploadHandlers.mockReturnValue(unregisterUpload);

    let result: { current: ReturnType<typeof useStorageWithSurvey> };
    await act(async () => {
      const view = renderHook(
        () =>
          useStorageWithSurvey({
            model,
            formId: "test-form",
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
      unregister = result!.current.registerStorageHandlers(model);
    });
    act(() => {
      unregister();
    });

    expect(unregisterUpload).toHaveBeenCalled();
  });
});
