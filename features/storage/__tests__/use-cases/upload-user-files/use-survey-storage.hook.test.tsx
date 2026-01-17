import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React, { Suspense } from "react";
import { SurveyModel } from "survey-core";
import { useSurveyStorage } from "@/features/storage/client";
import { Result } from "@/lib/result";
import { ContainerReadToken } from "@/features/storage/types";
import { StorageConfigProvider } from "@/features/storage/client";
import { StorageConfig } from "@/features/storage/client";

// Mock the hooks
const mockSetModelMetadata = vi.fn();
const mockRegisterViewHandlers = vi.fn();
const mockRegisterUploadHandlers = vi.fn();

vi.mock(
  "@/features/storage/use-cases/view-protected-files/use-storage-view.hook",
  () => ({
    useStorageView: () => ({
      setModelMetadata: mockSetModelMetadata,
      registerViewHandlers: mockRegisterViewHandlers,
    }),
  }),
);

vi.mock(
  "@/features/storage/use-cases/upload-user-files/use-storage-upload.hook",
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

describe("useSurveyStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterViewHandlers.mockReturnValue(() => {});
    mockRegisterUploadHandlers.mockReturnValue(() => {});
  });

  const wrapper = (config: StorageConfig | null) => {
    function TestStorageConfigWrapper({
      children,
    }: {
      children: React.ReactNode;
    }) {
      return (
        <Suspense fallback={<div>Loading...</div>}>
          <StorageConfigProvider config={config}>
            {children}
          </StorageConfigProvider>
        </Suspense>
      );
    }
    return TestStorageConfigWrapper;
  };

  it("should return registerStorageHandlers function immediately when readTokenPromises is not provided", () => {
    const model = createMockSurveyModel();
    const { result } = renderHook(
      () =>
        useSurveyStorage({
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
    expect(mockRegisterViewHandlers).not.toHaveBeenCalled();
    expect(mockRegisterUploadHandlers).not.toHaveBeenCalled();
    unregister();
  });

  describe("when readTokenPromises is provided", () => {
    const readTokenPromises = createReadTokenPromises();

    it("should handle disabled storage", async () => {
      const disabledConfig: StorageConfig = {
        isEnabled: false,
        isPrivate: false,
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      const model = createMockSurveyModel();
      const { result } = renderHook(
        () =>
          useSurveyStorage({
            model,
            formId: "test-form",
            readTokenPromises,
          }),
        {
          wrapper: wrapper(disabledConfig),
        },
      );

      expect(result.current.registerStorageHandlers).toBeDefined();
      expect(mockSetModelMetadata).toHaveBeenCalledWith(model);

      let unregister: () => void = () => {};
      act(() => {
        unregister = result.current.registerStorageHandlers(model);
      });
      expect(mockRegisterUploadHandlers).not.toHaveBeenCalled();
      expect(mockRegisterViewHandlers).not.toHaveBeenCalled();
      unregister();
    });

    it("should register upload handlers but not view handlers when not private", async () => {
      const publicConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: false,
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      const model = createMockSurveyModel();
      const { result } = renderHook(
        () =>
          useSurveyStorage({
            model,
            formId: "test-form",
            readTokenPromises,
          }),
        {
          wrapper: wrapper(publicConfig),
        },
      );

      expect(mockSetModelMetadata).toHaveBeenCalledWith(model);

      let unregister: () => void = () => {};
      act(() => {
        unregister = result.current.registerStorageHandlers(model);
      });
      expect(mockRegisterUploadHandlers).toHaveBeenCalledWith(model);
      expect(mockRegisterViewHandlers).not.toHaveBeenCalled();
      unregister();
    });

    it("should register both upload and view handlers when private", async () => {
      const privateConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: true,
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      const model = createMockSurveyModel();
      const { result } = renderHook(
        () =>
          useSurveyStorage({
            model,
            formId: "test-form",
            readTokenPromises,
          }),
        {
          wrapper: wrapper(privateConfig),
        },
      );

      expect(mockSetModelMetadata).toHaveBeenCalledWith(model);

      let unregister: () => void = () => {};
      act(() => {
        unregister = result.current.registerStorageHandlers(model);
      });
      expect(mockRegisterUploadHandlers).toHaveBeenCalledWith(model);
      expect(mockRegisterViewHandlers).toHaveBeenCalledWith(model);
      unregister();
    });

    it("should return a combined cleanup function", async () => {
      const privateConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: true,
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      const model = createMockSurveyModel();
      const unregisterUpload = vi.fn();
      const unregisterView = vi.fn();
      mockRegisterUploadHandlers.mockReturnValue(unregisterUpload);
      mockRegisterViewHandlers.mockReturnValue(unregisterView);

      const { result } = renderHook(
        () =>
          useSurveyStorage({
            model,
            formId: "test-form",
            readTokenPromises,
          }),
        {
          wrapper: wrapper(privateConfig),
        },
      );

      let unregister: () => void = () => {};
      act(() => {
        unregister = result.current.registerStorageHandlers(model);
      });
      act(() => {
        unregister();
      });

      expect(unregisterUpload).toHaveBeenCalled();
      expect(unregisterView).toHaveBeenCalled();
    });
  });
});
