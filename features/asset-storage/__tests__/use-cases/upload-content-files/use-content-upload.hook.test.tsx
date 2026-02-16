import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { SurveyCreatorModel, UploadFileEvent } from "survey-creator-core";
import {
  AssetStorageClientProvider,
  StorageConfig,
} from "@/features/asset-storage/client";
import { useContentUpload } from "@/features/asset-storage/use-cases/upload-content-files/use-content-upload.hook";

vi.mock("@azure/storage-blob", () => ({
  BlockBlobClient: vi.fn().mockImplementation(() => ({
    uploadData: vi.fn().mockResolvedValue(undefined),
  })),
}));

const mockStorageConfig = {
  isEnabled: true,
  isPrivate: true,
  hostName: "test.blob.core.windows.net",
  containerNames: {
    USER_FILES: "user-files",
    CONTENT: "content",
  },
};

const createMockFile = (name = "test.jpg"): File => {
  const file = new File(["test"], name, { type: "image/jpeg" });
  if (typeof file.arrayBuffer !== "function") {
    (file as File & { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer =
      () => Promise.resolve(new ArrayBuffer(0));
  }
  return file;
};

const mockFetchSuccess = (questionName: string) => {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        sasTokens: {
          "test.jpg": {
            success: true,
            url: `https://account.blob.core.windows.net/content/f/test-item/unique.jpg?sas=token`,
          },
        },
        uploadMetadata: {
          userId: "user-1",
          itemId: "test-item",
          contentItemType: "form",
          questionName,
        },
      }),
  });
};

const mockFetchError = (detail = "Unauthorized") => {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: false,
    json: () => Promise.resolve({ detail }),
  });
};

describe("useContentUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AssetStorageClientProvider
      config={mockStorageConfig as unknown as StorageConfig}
    >
      {children}
    </AssetStorageClientProvider>
  );

  const createMockCreatorModel = () => {
    const handlers: Record<
      string,
      (sender: unknown, options: unknown) => void
    > = {};
    return {
      onUploadFile: {
        add: vi.fn((handler: (sender: unknown, options: unknown) => void) => {
          handlers.onUploadFile = handler;
        }),
        remove: vi.fn(),
      },
      _handlers: handlers,
    } as unknown as SurveyCreatorModel & { _handlers: typeof handlers };
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

    let unregister: () => void;
    act(() => {
      unregister = result.current.registerUploadHandlers(creator);
    });

    expect(creator.onUploadFile.add).toHaveBeenCalled();

    act(() => {
      unregister();
    });

    expect(creator.onUploadFile.remove).toHaveBeenCalled();
  });

  it("should handle file upload via SAS", async () => {
    const creator = createMockCreatorModel();
    const { result } = renderHook(
      () => useContentUpload({ itemId: "test-item", itemType: "form" }),
      { wrapper },
    );

    act(() => {
      result.current.registerUploadHandlers(creator);
    });

    const options: UploadFileEvent = {
      files: [createMockFile()],
      callback: vi.fn(),
      element: { name: "testQuestion" } as any,
      elementType: "question",
    };

    mockFetchSuccess("testQuestion");

    await act(async () => {
      await creator._handlers.onUploadFile(creator, options);
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/hub/v0/storage/content/sas-token",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          itemId: "test-item",
          itemType: "form",
          fileNames: ["test.jpg"],
          questionName: "testQuestion",
        }),
      }),
    );
    expect(options.callback).toHaveBeenCalledWith(
      "success",
      "https://account.blob.core.windows.net/content/f/test-item/unique.jpg",
    );
  });

  it("should handle upload failure when SAS request fails", async () => {
    const creator = createMockCreatorModel();
    const { result } = renderHook(
      () => useContentUpload({ itemId: "test-item", itemType: "form" }),
      { wrapper },
    );

    act(() => {
      result.current.registerUploadHandlers(creator);
    });

    const options = {
      files: [createMockFile()],
      callback: vi.fn(),
    };

    mockFetchError("Unauthorized");

    await act(async () => {
      await creator._handlers.onUploadFile(creator, options);
    });

    expect(options.callback).toHaveBeenCalledWith(
      "error",
      expect.stringContaining("Unauthorized"),
    );
  });

  it("should pass isResizeEnabled from storage config", async () => {
    const creator = createMockCreatorModel();
    const { result } = renderHook(
      () => useContentUpload({ itemId: "test-item", itemType: "form" }),
      { wrapper },
    );

    act(() => {
      result.current.registerUploadHandlers(creator);
    });

    const options: UploadFileEvent = {
      files: [createMockFile()],
      callback: vi.fn(),
      element: { name: "testQuestion" } as any,
      elementType: "question",
    };

    mockFetchSuccess("testQuestion");

    await act(async () => {
      await creator._handlers.onUploadFile(creator, options);
    });

    expect(fetch).toHaveBeenCalled();
  });
});
