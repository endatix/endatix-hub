import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { SurveyCreatorModel } from "survey-creator-core";
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

/** Mock Base so upload event element passes instanceof Base and exposes getPropertyValue/uniqueId. */
vi.mock("survey-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("survey-core")>();
  class MockBase extends actual.Base {
    getPropertyValue(name: string): unknown {
      return name === "name" ? "question1" : undefined;
    }
    override get uniqueId(): number {
      return 1;
    }
  }
  return { ...actual, Base: MockBase };
});

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

    const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
    if (typeof mockFile.arrayBuffer !== "function") {
      (
        mockFile as File & { arrayBuffer: () => Promise<ArrayBuffer> }
      ).arrayBuffer = () => Promise.resolve(new ArrayBuffer(0));
    }
    const { Base } = await import("survey-core");
    const element = new Base();
    const options = {
      files: [mockFile],
      callback: vi.fn(),
      element,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          sasTokens: {
            "test.jpg": {
              success: true,
              url: "https://account.blob.core.windows.net/content/f/test-item/unique.jpg?sas=token",
            },
          },
          uploadMetadata: {
            userId: "user-1",
            itemId: "test-item",
            contentItemType: "form",
            questionName: "question1",
          },
        }),
    });

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
          questionName: "question1",
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

    const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const options = {
      files: [mockFile],
      callback: vi.fn(),
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: "Unauthorized" }),
    });

    await act(async () => {
      await creator._handlers.onUploadFile(creator, options);
    });

    expect(options.callback).toHaveBeenCalledWith(
      "error",
      expect.stringContaining("Unauthorized"),
    );
  });
});
