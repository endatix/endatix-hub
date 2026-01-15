import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React, { Suspense } from "react";
import { SurveyModel } from "survey-core";
import { SurveyStorageDecorator } from "@/features/storage/ui/survey-storage-decorator";
import { Result } from "@/lib/result";
import { ContainerReadToken } from "@/features/storage/types";
import { StorageConfigProvider } from "@/features/storage/infrastructure/storage-config-context";
import { StorageConfig } from "@/features/storage/infrastructure/storage-config-client";

// Mock the hooks
const mockSetModelMetadata = vi.fn();
const mockRegisterViewHandlers = vi.fn();
const mockRegisterUploadHandlers = vi.fn();

vi.mock(
  "@/features/storage/use-cases/view-files/use-storage-view.hook",
  () => ({
    useStorageView: () => ({
      setModelMetadata: mockSetModelMetadata,
      registerViewHandlers: mockRegisterViewHandlers,
    }),
  }),
);

vi.mock(
  "@/features/storage/use-cases/upload-files/use-storage-upload.hook",
  () => ({
    useStorageUpload: () => ({
      registerUploadHandlers: mockRegisterUploadHandlers,
    }),
  }),
);

const createMockSurveyModel = (): SurveyModel => {
  return {
    isPrivateStorage: false,
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

describe("SurveyStorageDecorator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterViewHandlers.mockReturnValue(() => {});
    mockRegisterUploadHandlers.mockReturnValue(() => {});
  });

  describe("when readTokenPromises is not provided", () => {
    it("should render children directly without Suspense", () => {
      const model = createMockSurveyModel();
      render(
        <SurveyStorageDecorator model={model} formId="test-form">
          <div data-testid="child">Child Content</div>
        </SurveyStorageDecorator>,
      );

      expect(screen.getByTestId("child")).toBeDefined();
      expect(screen.getByTestId("child").textContent).toBe("Child Content");
      expect(mockSetModelMetadata).not.toHaveBeenCalled();
      expect(mockRegisterViewHandlers).not.toHaveBeenCalled();
      expect(mockRegisterUploadHandlers).not.toHaveBeenCalled();
    });
  });

  describe("when readTokenPromises is provided", () => {
    const readTokenPromises = createReadTokenPromises();

    describe("with storage disabled", () => {
      const disabledConfig: StorageConfig = {
        isEnabled: false,
        isPrivate: false,
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      it("should not register any handlers", async () => {
        const model = createMockSurveyModel();

        render(
          <StorageConfigProvider config={disabledConfig}>
            <Suspense fallback={<div>Loading...</div>}>
              <SurveyStorageDecorator
                model={model}
                readTokenPromises={readTokenPromises}
                formId="test-form"
              >
                <div data-testid="child">Child Content</div>
              </SurveyStorageDecorator>
            </Suspense>
          </StorageConfigProvider>,
        );

        const childElement = await screen.findByTestId("child");

        expect(mockSetModelMetadata).toHaveBeenCalledWith(model);
        expect(mockRegisterUploadHandlers).not.toHaveBeenCalled();
        expect(mockRegisterViewHandlers).not.toHaveBeenCalled();
      });

      it("should render children after decoration", async () => {
        const model = createMockSurveyModel();

        render(
          <StorageConfigProvider config={disabledConfig}>
            <Suspense fallback={<div>Loading...</div>}>
              <SurveyStorageDecorator
                model={model}
                readTokenPromises={readTokenPromises}
                formId="test-form"
              >
                <div data-testid="child">Child Content</div>
              </SurveyStorageDecorator>
            </Suspense>
          </StorageConfigProvider>,
        );

        const childElement = await screen.findByTestId("child");
        expect(childElement.textContent).toBe("Child Content");
      });
    });

    describe("with storage enabled but not private", () => {
      const publicConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: false,
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      it("should register upload handlers but not view handlers", async () => {
        const model = createMockSurveyModel();
        const unregisterUpload = vi.fn();
        mockRegisterUploadHandlers.mockReturnValue(unregisterUpload);

        render(
          <StorageConfigProvider config={publicConfig}>
            <Suspense fallback={<div>Loading...</div>}>
              <SurveyStorageDecorator
                model={model}
                readTokenPromises={readTokenPromises}
                formId="test-form"
              >
                <div data-testid="child">Child Content</div>
              </SurveyStorageDecorator>
            </Suspense>
          </StorageConfigProvider>,
        );

        const childElement = await screen.findByTestId("child");

        expect(mockSetModelMetadata).toHaveBeenCalledWith(model);
        expect(mockRegisterUploadHandlers).toHaveBeenCalledWith(model);
        expect(mockRegisterViewHandlers).not.toHaveBeenCalled();
      });

      it("should render children after decoration", async () => {
        const model = createMockSurveyModel();

        render(
          <StorageConfigProvider config={publicConfig}>
            <Suspense fallback={<div>Loading...</div>}>
              <SurveyStorageDecorator
                model={model}
                readTokenPromises={readTokenPromises}
                formId="test-form"
              >
                <div data-testid="child">Child Content</div>
              </SurveyStorageDecorator>
            </Suspense>
          </StorageConfigProvider>,
        );

        const childElement = await screen.findByTestId("child");
        expect(childElement.textContent).toBe("Child Content");
      });
    });

    describe("with storage enabled and private", () => {
      const privateConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: true,
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      it("should register both upload and view handlers", async () => {
        const model = createMockSurveyModel();
        const unregisterUpload = vi.fn();
        const unregisterView = vi.fn();
        mockRegisterUploadHandlers.mockReturnValue(unregisterUpload);
        mockRegisterViewHandlers.mockReturnValue(unregisterView);

        render(
          <StorageConfigProvider config={privateConfig}>
            <Suspense fallback={<div>Loading...</div>}>
              <SurveyStorageDecorator
                model={model}
                readTokenPromises={readTokenPromises}
                formId="test-form"
              >
                <div data-testid="child">Child Content</div>
              </SurveyStorageDecorator>
            </Suspense>
          </StorageConfigProvider>,
        );

        const childElement = await screen.findByTestId("child");

        expect(mockSetModelMetadata).toHaveBeenCalledWith(model);
        expect(mockRegisterUploadHandlers).toHaveBeenCalledWith(model);
        expect(mockRegisterViewHandlers).toHaveBeenCalledWith(model);
      });

      it("should render children after decoration", async () => {
        const model = createMockSurveyModel();

        render(
          <StorageConfigProvider config={privateConfig}>
            <Suspense fallback={<div>Loading...</div>}>
              <SurveyStorageDecorator
                model={model}
                readTokenPromises={readTokenPromises}
                formId="test-form"
              >
                <div data-testid="child">Child Content</div>
              </SurveyStorageDecorator>
            </Suspense>
          </StorageConfigProvider>,
        );

        const childElement = await screen.findByTestId("child");
        expect(childElement.textContent).toBe("Child Content");
      });
    });

    describe("cleanup", () => {
      const privateConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: true,
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      it("should cleanup handlers on unmount", async () => {
        const model = createMockSurveyModel();
        const unregisterUpload = vi.fn();
        const unregisterView = vi.fn();
        mockRegisterUploadHandlers.mockReturnValue(unregisterUpload);
        mockRegisterViewHandlers.mockReturnValue(unregisterView);

        const { unmount } = render(
          <StorageConfigProvider config={privateConfig}>
            <Suspense fallback={<div>Loading...</div>}>
              <SurveyStorageDecorator
                model={model}
                readTokenPromises={readTokenPromises}
                formId="test-form"
              >
                <div data-testid="child">Child Content</div>
              </SurveyStorageDecorator>
            </Suspense>
          </StorageConfigProvider>,
        );

        const childElement = await screen.findByTestId("child");
        expect(childElement).toBeDefined();

        unmount();

        expect(unregisterUpload).toHaveBeenCalled();
        expect(unregisterView).toHaveBeenCalled();
      });

      it("should not setup cleanup when storage is not private (early return)", async () => {
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
        const unregisterUpload = vi.fn();
        mockRegisterUploadHandlers.mockReturnValue(unregisterUpload);

        const { unmount } = render(
          <StorageConfigProvider config={publicConfig}>
            <Suspense fallback={<div>Loading...</div>}>
              <SurveyStorageDecorator
                model={model}
                readTokenPromises={readTokenPromises}
                formId="test-form"
              >
                <div data-testid="child">Child Content</div>
              </SurveyStorageDecorator>
            </Suspense>
          </StorageConfigProvider>,
        );

        const childElement = await screen.findByTestId("child");
        expect(childElement).toBeDefined();

        // Verify upload handlers were registered
        expect(mockRegisterUploadHandlers).toHaveBeenCalledWith(model);
        expect(mockRegisterViewHandlers).not.toHaveBeenCalled();

        // When storage is not private, the effect returns early,
        // so no cleanup function is set up
        unmount();

        // Cleanup is not called because the effect returned early
        expect(unregisterUpload).not.toHaveBeenCalled();
      });
    });

    describe("Suspense behavior", () => {
      const privateConfig: StorageConfig = {
        isEnabled: true,
        isPrivate: true,
        hostName: "testaccount.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      };

      it("should use Suspense with fallback", async () => {
        const model = createMockSurveyModel();
        const fallbackContent = "Loading fallback...";

        render(
          <StorageConfigProvider config={privateConfig}>
            <Suspense
              fallback={<div data-testid="fallback">{fallbackContent}</div>}
            >
              <SurveyStorageDecorator
                model={model}
                readTokenPromises={readTokenPromises}
                formId="test-form"
              >
                <div data-testid="child">Child Content</div>
              </SurveyStorageDecorator>
            </Suspense>
          </StorageConfigProvider>,
        );

        // Initially might show fallback, then child
        const childElement = await screen.findByTestId("child");
        expect(childElement.textContent).toBe("Child Content");
      });
    });

    describe("with null storage config", () => {
      it("should not register any handlers when config is null", async () => {
        const model = createMockSurveyModel();

        render(
          <StorageConfigProvider config={null}>
            <Suspense fallback={<div>Loading...</div>}>
              <SurveyStorageDecorator
                model={model}
                readTokenPromises={readTokenPromises}
                formId="test-form"
              >
                <div data-testid="child">Child Content</div>
              </SurveyStorageDecorator>
            </Suspense>
          </StorageConfigProvider>,
        );

        const childElement = await screen.findByTestId("child");
        expect(childElement).toBeDefined();

        expect(mockSetModelMetadata).toHaveBeenCalledWith(model);
        expect(mockRegisterUploadHandlers).not.toHaveBeenCalled();
        expect(mockRegisterViewHandlers).not.toHaveBeenCalled();
      });
    });
  });
});
