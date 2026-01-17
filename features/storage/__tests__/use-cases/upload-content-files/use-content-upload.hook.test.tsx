import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { SurveyCreatorModel } from "survey-creator-core";
import {
  useContentUpload,
  StorageConfigProvider,
} from "@/features/storage/client";
import { Result } from "@/lib/result";

// Mock the action
const mockUploadContentFileAction = vi.fn();
vi.mock(
  "@/features/storage/use-cases/upload-content-files/upload-content-file.action",
  () => ({
    uploadContentFileAction: (formData: FormData) =>
      mockUploadContentFileAction(formData),
  }),
);

const mockStorageConfig = {
  isEnabled: true,
  isPrivate: true,
  hostName: "test.blob.core.windows.net",
  containerNames: {
    USER_FILES: "user-files",
    CONTENT: "content",
  },
};

describe("useContentUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <StorageConfigProvider config={mockStorageConfig}>
      {children}
    </StorageConfigProvider>
  );

  const createMockCreatorModel = () => {
    const handlers: Record<string, (sender: any, options: any) => void> = {};
    return {
      onUploadFile: {
        add: vi.fn((handler) => {
          handlers.onUploadFile = handler;
        }),
        remove: vi.fn(),
      },
      _handlers: handlers,
    } as unknown as SurveyCreatorModel & { _handlers: any };
  };

  it("should return registerUploadHandlers function", () => {
    const { result } = renderHook(
      () => useContentUpload({ itemId: "test-item", itemType: "form" }),
      { wrapper },
    );

    expect(result.current.registerUploadHandlers).toBeDefined();
  });

  it("should register event handlers on the creator model", () => {
    const creator = createMockCreatorModel();
    const { result } = renderHook(
      () => useContentUpload({ itemId: "test-item", itemType: "form" }),
      { wrapper },
    );

    let unregister: any;
    act(() => {
      unregister = result.current.registerUploadHandlers(creator);
    });

    expect(creator.onUploadFile.add).toHaveBeenCalled();

    act(() => {
      unregister();
    });

    expect(creator.onUploadFile.remove).toHaveBeenCalled();
  });

  it("should handle file upload", async () => {
    const creator = createMockCreatorModel();
    const { result } = renderHook(
      () => useContentUpload({ itemId: "test-item", itemType: "form" }),
      { wrapper },
    );

    act(() => {
      result.current.registerUploadHandlers(creator);
    });

    const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const options = {
      files: [mockFile],
      callback: vi.fn(),
    };

    mockUploadContentFileAction.mockResolvedValueOnce(
      Result.success({ url: "https://test.com/test.jpg" }),
    );

    await act(async () => {
      await creator._handlers.onUploadFile(creator, options);
    });

    expect(mockUploadContentFileAction).toHaveBeenCalled();
    expect(options.callback).toHaveBeenCalledWith(
      "success",
      "https://test.com/test.jpg",
    );
  });

  it("should handle upload failure", async () => {
    const creator = createMockCreatorModel();
    const { result } = renderHook(
      () => useContentUpload({ itemId: "test-item", itemType: "form" }),
      { wrapper },
    );

    act(() => {
      result.current.registerUploadHandlers(creator);
    });

    const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const options = {
      files: [mockFile],
      callback: vi.fn(),
    };

    mockUploadContentFileAction.mockResolvedValueOnce(
      Result.error("API Error"),
    );

    await act(async () => {
      await creator._handlers.onUploadFile(creator, options);
    });

    expect(options.callback).toHaveBeenCalledWith("error", "API Error");
  });
});
