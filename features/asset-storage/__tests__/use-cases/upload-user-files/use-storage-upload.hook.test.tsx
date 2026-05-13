import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import React, { Suspense } from "react";
import { AssetStorageClientProvider } from "@/features/asset-storage/client";
import { useStorageUpload } from "@/features/asset-storage/use-cases/upload-user-files/use-storage-upload.hook";
import {
  SurveyModel,
  UploadFilesEvent,
  ClearFilesEvent,
  DownloadFileEvent,
} from "survey-core";
import { Result } from "@/lib/result";
import { processUploadError } from "@/features/asset-storage/use-cases/upload";

// Mock fetch globally
global.fetch = vi.fn();

const resolvedTokenResult = Result.success({
  token: "",
  isPrivate: false,
  hostName: "test.blob.core.windows.net",
  containerName: "user-files",
  expiresOn: new Date(),
  generatedAt: new Date(),
});

// Create promises that are already resolved
// React's use hook should be able to read these without suspending
const sharedResolvedPromise = Promise.resolve(resolvedTokenResult);

const createDefaultReadTokenPromises = () => ({
  userFiles: sharedResolvedPromise,
  content: sharedResolvedPromise,
});

const mockStorageConfig = {
  isEnabled: true,
  isPrivate: true,
  hostName: "test.blob.core.windows.net",
  protocol: "https" as const,
  containerNames: {
    USER_FILES: "user-files",
    CONTENT: "content",
  },
  imageConfig: { isResizeEnabled: true, defaultResizeWidth: 800 },
};

describe("useStorageUpload", () => {
  const mockFormId = "form-123";
  const mockSubmissionId = "submission-123";
  const mockOnSubmissionIdChange = vi.fn();
  const mockSurveyModel = {
    locale: "en",
    onUploadFiles: {
      add: vi.fn(),
      remove: vi.fn(),
    },
    onClearFiles: {
      add: vi.fn(),
      remove: vi.fn(),
    },
    onDownloadFile: {
      add: vi.fn(),
      remove: vi.fn(),
    },
  } as unknown as SurveyModel;

  const createWrapper = (
    config: typeof mockStorageConfig | null = mockStorageConfig,
    readTokenPromises = createDefaultReadTokenPromises(),
  ) => {
    function TestWrapper({ children }: { children: React.ReactNode }) {
      return (
        <Suspense fallback={<div>Loading...</div>}>
          <AssetStorageClientProvider
            config={config}
            tokens={readTokenPromises}
          >
            {children}
          </AssetStorageClientProvider>
        </Suspense>
      );
    }
    return TestWrapper;
  };

  const createHookProps = (
    overrides?: Partial<Parameters<typeof useStorageUpload>[0]> & {
      submissionId?: string;
    },
  ) => {
    const { submissionId, ...restOverrides } = overrides ?? {};

    return {
      formId: mockFormId,
      surveyModel: mockSurveyModel,
      ...(submissionId
        ? { getSubmissionId: () => submissionId }
        : {}),
      ...restOverrides,
    };
  };

  const mockFile = new File(["test content"], "test.jpg", {
    type: "image/jpeg",
  });

  const mockLargeFile = new File(["large content"], "large-video.mp4", {
    type: "video/mp4",
  });

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("hook initialization", () => {
    it("should initialize with default submissionId", async () => {
      const props = createHookProps();
      let result: ReturnType<typeof renderHook>["result"];

      await act(async () => {
        const view = renderHook(() => useStorageUpload(props), {
          wrapper: createWrapper(),
        });
        result = view.result;
        await Promise.resolve();
      });

      // The hook should return after the promise resolves
      expect(result!.current).not.toBeNull();
      const hookResult = result!.current as ReturnType<typeof useStorageUpload>;
      expect(hookResult.registerUploadHandlers).toBeDefined();
      expect(hookResult.uploadFiles).toBeDefined();
      expect(hookResult.deleteFiles).toBeDefined();
    });

    it("should initialize without readTokenPromises", async () => {
      const props = {
        formId: mockFormId,
        surveyModel: mockSurveyModel,
      };
      let result: ReturnType<typeof renderHook>["result"];

      await act(async () => {
        const view = renderHook(() => useStorageUpload(props), {
          wrapper: createWrapper(),
        });
        result = view.result;
        await Promise.resolve();
      });

      expect(result!.current).not.toBeNull();
      const hookResult = result!.current as ReturnType<typeof useStorageUpload>;
      expect(hookResult.registerUploadHandlers).toBeDefined();
      expect(hookResult.uploadFiles).toBeDefined();
      expect(hookResult.deleteFiles).toBeDefined();
    });

    it("should provide registerUploadHandlers that adds event handlers on surveyModel", async () => {
      const { result } = renderHook(
        () =>
          useStorageUpload(
            createHookProps({
              submissionId: mockSubmissionId,
              onSubmissionIdChange: mockOnSubmissionIdChange,
            }),
          ),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        result.current.registerUploadHandlers(mockSurveyModel);
      });

      expect(mockSurveyModel.onUploadFiles.add).toHaveBeenCalledTimes(1);
      expect(mockSurveyModel.onClearFiles.add).toHaveBeenCalledTimes(1);
      expect(mockSurveyModel.onDownloadFile.add).toHaveBeenCalledTimes(1);
    });

    it("should return cleanup function from registerUploadHandlers", async () => {
      const { result } = renderHook(() => useStorageUpload(createHookProps()), {
        wrapper: createWrapper(),
      });

      let unregister: () => void = () => {};
      await act(async () => {
        unregister = result.current.registerUploadHandlers(mockSurveyModel);
      });

      expect(mockSurveyModel.onUploadFiles.add).toHaveBeenCalled();

      await act(async () => {
        unregister();
      });

      expect(mockSurveyModel.onUploadFiles.remove).toHaveBeenCalledTimes(1);
      expect(mockSurveyModel.onClearFiles.remove).toHaveBeenCalledTimes(1);
      expect(mockSurveyModel.onDownloadFile.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe("uploadFiles", () => {
    const mockUploadOptions: UploadFilesEvent = {
      files: [mockFile],
      callback: vi.fn(),
    } as unknown as UploadFilesEvent;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should upload small image via resize then SAS (browser-to-storage)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              uploads: {
                "test.jpg": {
                  url: "https://test.blob.core.windows.net/test?sas-token",
                  headers: { "x-ms-blob-type": "BlockBlob" },
                  key: "mock/blob-key",
                },
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          headers: new Headers({ "Content-Type": "image/jpeg" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(""),
        });

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      // Flush suspense so hook resolves (use() with readTokenPromises)
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current).not.toBeNull();

      await act(async () => {
        await result.current!.uploadFiles(mockSurveyModel, mockUploadOptions);
      });

      // Should call upload-urls first, then resize-image for small images (browser-to-storage)
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/upload-urls",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            fileNames: ["test.jpg"],
            submissionId: mockSubmissionId,
            formId: mockFormId,
            formLocale: "en",
          }),
        }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/resize-image",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("should resolve submissionId from getSubmissionId when submissionId prop is omitted", async () => {
      const runtimeSubmissionId = "runtime-submission-456";

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              uploads: {
                "test.jpg": {
                  url: "https://test.blob.core.windows.net/test?sas-token",
                  headers: { "x-ms-blob-type": "BlockBlob" },
                  key: "mock/blob-key",
                },
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          headers: new Headers({ "Content-Type": "image/jpeg" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(""),
        });

      const { result } = renderHook(
        () =>
          useStorageUpload(
            createHookProps({
              getSubmissionId: () => runtimeSubmissionId,
            }),
          ),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        await result.current!.uploadFiles(mockSurveyModel, mockUploadOptions);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/upload-urls",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            fileNames: ["test.jpg"],
            submissionId: runtimeSubmissionId,
            formId: mockFormId,
            formLocale: "en",
          }),
        }),
      );
    });

    it("should upload large files directly to blob storage", async () => {
      const largeFileOptions: UploadFilesEvent = {
        files: [mockLargeFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              uploads: {
                "large-video.mp4": {
                  url: "https://test.blob.core.windows.net/large?sas-token",
                  headers: { "x-ms-blob-type": "BlockBlob" },
                  key: "mock/blob-key",
                },
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(""),
        });

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, largeFileOptions);
      });

      // Should call SAS token endpoint for large files
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/upload-urls",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            fileNames: ["large-video.mp4"],
            submissionId: mockSubmissionId,
            formId: mockFormId,
            formLocale: "en",
          }),
        }),
      );
    });

    it("should handle mixed file types correctly", async () => {
      const mixedFilesOptions: UploadFilesEvent = {
        files: [mockFile, mockLargeFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      const uploadsPayload = {
        uploads: {
          "test.jpg": {
            url: "https://test.blob.core.windows.net/test?sas-token",
            headers: { "x-ms-blob-type": "BlockBlob" },
            key: "mock/blob-key",
          },
          "large-video.mp4": {
            url: "https://test.blob.core.windows.net/large?sas-token",
            headers: { "x-ms-blob-type": "BlockBlob" },
            key: "mock/blob-key",
          },
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        async (input: RequestInfo | URL) => {
          const u = typeof input === "string" ? input : input.toString();
          if (u.includes("/upload-urls")) {
            return {
              ok: true,
              json: () => Promise.resolve(uploadsPayload),
            };
          }
          if (u.includes("/resize-image")) {
            return {
              ok: true,
              arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
              headers: new Headers({ "Content-Type": "image/jpeg" }),
            };
          }
          return {
            ok: true,
            text: () => Promise.resolve(""),
          };
        },
      );

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, mixedFilesOptions);
      });

      // SAS token once for all files, then resize-image for the small image
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/upload-urls",
        expect.any(Object),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/resize-image",
        expect.any(Object),
      );
    });

    it("should handle upload errors gracefully", async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockReset()
        .mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, mockUploadOptions);
      });

      expect(mockUploadOptions.callback).toHaveBeenCalledWith(
        [],
        ["Network error"],
      );
    });

    it("should call callback with results", async () => {
      const file = new File(["test content"], "test.jpg", {
        type: "image/jpeg",
      });
      Object.defineProperty(file, "size", { value: 100, writable: true });
      Object.defineProperty(file, "arrayBuffer", {
        value: () => Promise.resolve(new ArrayBuffer(8)),
        writable: true,
      });

      const mockCallback = vi.fn();
      const uploadOptions: UploadFilesEvent = {
        files: [file],
        callback: mockCallback,
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              uploads: {
                "test.jpg": {
                  url: "https://test.blob.core.windows.net/test?sas=1",
                  headers: { "x-ms-blob-type": "BlockBlob" },
                  key: "mock/key",
                },
              },
              submissionId: mockSubmissionId,
              userId: "user-1",
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          headers: new Headers({ "Content-Type": "image/jpeg" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(""),
        });

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            file,
            content: "https://test.blob.core.windows.net/test",
          }),
        ]),
        [],
      );
    });
  });

  describe("deleteFiles", () => {
    const mockClearOptions: ClearFilesEvent = {
      value: [
        {
          name: "test.jpg",
          content: "https://test.blob.core.windows.net/test",
        },
        {
          name: "test2.jpg",
          content: "https://test.blob.core.windows.net/test2",
        },
      ],
      callback: vi.fn(),
      question: { storeDataAsText: false },
    } as unknown as ClearFilesEvent;

    beforeEach(() => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                fileUrl: "https://test.blob.core.windows.net/test",
                result: "success",
              },
              {
                fileUrl: "https://test.blob.core.windows.net/test2",
                result: "error",
                error: "File not found",
              },
            ],
          }),
      });
    });

    it("should delete files successfully", async () => {
      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.deleteFiles(mockSurveyModel, mockClearOptions);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/delete",
        expect.objectContaining({
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            formId: mockFormId,
            submissionId: mockSubmissionId,
            fileUrls: [
              "https://test.blob.core.windows.net/test",
              "https://test.blob.core.windows.net/test2",
            ],
          }),
        }),
      );
    });

    it("should handle empty file list", async () => {
      const emptyOptions: ClearFilesEvent = {
        value: [],
        callback: vi.fn(),
      } as unknown as ClearFilesEvent;

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.deleteFiles(mockSurveyModel, emptyOptions);
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(emptyOptions.callback).toHaveBeenCalledWith("success");
    });

    it("should return success if storeDataAsText is true", async () => {
      const emptyOptions: ClearFilesEvent = {
        value: [],
        callback: vi.fn(),
        question: { storeDataAsText: true },
      } as unknown as ClearFilesEvent;

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.deleteFiles(mockSurveyModel, emptyOptions);
      });

      expect(emptyOptions.callback).toHaveBeenCalledWith("success");
    });

    it("should handle specific file deletion", async () => {
      const specificFileOptions: ClearFilesEvent = {
        value: [
          {
            name: "test.jpg",
            content: "https://test.blob.core.windows.net/test",
          },
          {
            name: "test2.jpg",
            content: "https://test.blob.core.windows.net/test2",
          },
        ],
        fileName: "test.jpg",
        callback: vi.fn(),
      } as unknown as ClearFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                fileUrl: "https://test.blob.core.windows.net/test",
                result: "success",
              },
            ],
          }),
      });

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.deleteFiles(mockSurveyModel, specificFileOptions);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/delete",
        expect.objectContaining({
          body: JSON.stringify({
            formId: mockFormId,
            submissionId: mockSubmissionId,
            fileUrls: ["https://test.blob.core.windows.net/test"],
          }),
        }),
      );
    });

    it("should handle partial deletion success", async () => {
      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.deleteFiles(mockSurveyModel, mockClearOptions);
      });

      // Should call callback for both success and error
      expect(mockClearOptions.callback).toHaveBeenCalledWith("success", [
        { content: "https://test.blob.core.windows.net/test" },
      ]);
      expect(mockClearOptions.callback).toHaveBeenCalledWith(
        "error",
        "File not found",
      );
    });

    it("should handle API errors", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "API Error" }),
      });

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.deleteFiles(mockSurveyModel, mockClearOptions);
      });

      expect(mockClearOptions.callback).toHaveBeenCalledWith("error");
    });

    it("should handle network errors", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.deleteFiles(mockSurveyModel, mockClearOptions);
      });

      expect(mockClearOptions.callback).toHaveBeenCalledWith("error");
    });

    it("should handle file not found scenario", async () => {
      const notFoundOptions: ClearFilesEvent = {
        value: [
          {
            name: "test.jpg",
            content: "https://test.blob.core.windows.net/test",
          },
        ],
        fileName: "nonexistent.jpg",
        callback: vi.fn(),
      } as unknown as ClearFilesEvent;

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.deleteFiles(mockSurveyModel, notFoundOptions);
      });

      expect(notFoundOptions.callback).toHaveBeenCalledWith("error");
    });
  });

  describe("file classification", () => {
    it("should classify small images for server upload", async () => {
      const smallImageFile = new File(["small"], "small.jpg", {
        type: "image/jpeg",
      });
      Object.defineProperty(smallImageFile, "size", { value: 1024 * 1024 }); // 1MB

      const uploadOptions: UploadFilesEvent = {
        files: [smallImageFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              uploads: {
                "small.jpg": {
                  url: "https://test.blob.core.windows.net/small?sas-token",
                  headers: { "x-ms-blob-type": "BlockBlob" },
                  key: "mock/blob-key",
                },
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          headers: new Headers({ "Content-Type": "image/jpeg" }),
        });

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      // Should call SAS token then resize-image for small images
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/upload-urls",
        expect.any(Object),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/resize-image",
        expect.any(Object),
      );
    });

    it("should classify large images for direct blob upload", async () => {
      const largeImageFile = new File(["large"], "large.jpg", {
        type: "image/jpeg",
      });
      Object.defineProperty(largeImageFile, "size", {
        value: 25 * 1024 * 1024,
      }); // 25MB

      const uploadOptions: UploadFilesEvent = {
        files: [largeImageFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            uploads: {
              "large.jpg": {
                  url: "https://test.blob.core.windows.net/large?sas-token",
                  headers: { "x-ms-blob-type": "BlockBlob" },
                  key: "mock/blob-key",
                },
            },
          }),
      });

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      // Should call SAS token endpoint
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/upload-urls",
        expect.any(Object),
      );
    });

    it("should classify non-image files for direct blob upload", async () => {
      const pdfFile = new File(["pdf content"], "document.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(pdfFile, "size", { value: 1024 }); // 1KB

      const uploadOptions: UploadFilesEvent = {
        files: [pdfFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            uploads: {
              "document.pdf": {
                  url: "https://test.blob.core.windows.net/document?sas-token",
                  headers: { "x-ms-blob-type": "BlockBlob" },
                  key: "mock/blob-key",
                },
            },
          }),
      });

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      // Should call SAS token endpoint for non-image files
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/upload-urls",
        expect.any(Object),
      );
    });
  });

  describe("submission ID handling", () => {
    it("should call onSubmissionIdChange when submission ID changes", async () => {
      const uploadOptions: UploadFilesEvent = {
        files: [mockFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              submissionId: "new-submission-id",
              userId: "user-1",
              uploads: {
                "test.jpg": {
                  url: "https://test.blob.core.windows.net/test?sas-token",
                  headers: { "x-ms-blob-type": "BlockBlob" },
                  key: "mock/blob-key",
                },
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          headers: new Headers({ "Content-Type": "image/jpeg" }),
        });

      const { result } = renderHook(
        () =>
          useStorageUpload(
            createHookProps({
              submissionId: mockSubmissionId,
              onSubmissionIdChange: mockOnSubmissionIdChange,
            }),
          ),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(mockOnSubmissionIdChange).toHaveBeenCalledWith(
        "new-submission-id",
      );
    });

    it("should not call onSubmissionIdChange when submission ID is the same", async () => {
      const uploadOptions: UploadFilesEvent = {
        files: [mockFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              submissionId: mockSubmissionId, // Same as current
              userId: "user-1",
              uploads: {
                "test.jpg": {
                  url: "https://test.blob.core.windows.net/test?sas-token",
                  headers: { "x-ms-blob-type": "BlockBlob" },
                  key: "mock/blob-key",
                },
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          headers: new Headers({ "Content-Type": "video/mp4" }),
        });

      const { result } = renderHook(
        () =>
          useStorageUpload(
            createHookProps({
              submissionId: mockSubmissionId,
              onSubmissionIdChange: mockOnSubmissionIdChange,
            }),
          ),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(mockOnSubmissionIdChange).not.toHaveBeenCalled();
    });
  });

  describe("onDownloadFile", () => {
    const mockDownloadOptions: DownloadFileEvent = {
      content: "https://test.blob.core.windows.net/user-files/test.pdf",
      fileValue: {
        name: "test.pdf",
        type: "application/pdf",
      },
      callback: vi.fn(),
    } as unknown as DownloadFileEvent;

    beforeEach(() => {
      // Mock FileReader
      class MockFileReader {
        result: string | ArrayBuffer | null = null;
        onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
        onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;

        readAsDataURL(_blob: Blob) {
          setTimeout(() => {
            if (this.onload) {
              this.result = "data:application/pdf;base64,test";
              const mockEvent = {
                target: this,
                lengthComputable: false,
                loaded: 0,
                total: 0,
              } as unknown as ProgressEvent<FileReader>;
              this.onload(mockEvent);
            }
          }, 0);
        }
      }

      global.FileReader = MockFileReader as unknown as typeof FileReader;
    });

    it("should call read-token API and use token when storage is private", async () => {
      const props = createHookProps();

      let result: ReturnType<typeof renderHook>["result"];
      await act(async () => {
        const view = renderHook(() => useStorageUpload(props), {
          wrapper: createWrapper(mockStorageConfig),
        });
        result = view.result;
        await Promise.resolve();
      });

      // Mock the read-token API response
      const fileUrl = "https://test.blob.core.windows.net/user-files/test.pdf";
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              resolved: {
                [fileUrl]: {
                  url: `${fileUrl}?on-demand-token-123`,
                },
              },
            }),
        })
        .mockResolvedValueOnce({
          blob: () =>
            Promise.resolve(new Blob(["test"], { type: "application/pdf" })),
        });

      await act(async () => {
        (
          result.current as ReturnType<typeof useStorageUpload>
        ).registerUploadHandlers(mockSurveyModel);
        const downloadHandler = (
          mockSurveyModel.onDownloadFile.add as ReturnType<typeof vi.fn>
        ).mock.calls[0][0];
        await downloadHandler(mockSurveyModel, mockDownloadOptions);
      });

      // Should call read-token API first
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/read-urls",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            urls: ["https://test.blob.core.windows.net/user-files/test.pdf"],
          }),
        }),
      );

      // Should use the token from the API response
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.blob.core.windows.net/user-files/test.pdf?on-demand-token-123",
      );

      // Wait for FileReader async operation
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      expect(mockDownloadOptions.callback).toHaveBeenCalledWith(
        "success",
        "data:application/pdf;base64,test",
      );
    });

    it("should call callback with error when read-token API fails", async () => {
      const props = createHookProps();

      let result: ReturnType<typeof renderHook>["result"];
      await act(async () => {
        const view = renderHook(() => useStorageUpload(props), {
          wrapper: createWrapper(mockStorageConfig),
        });
        result = view.result;
        await Promise.resolve();
      });

      // Mock the read-token API failure
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized",
      });

      await act(async () => {
        (
          result.current as ReturnType<typeof useStorageUpload>
        ).registerUploadHandlers(mockSurveyModel);
        const downloadHandler = (
          mockSurveyModel.onDownloadFile.add as ReturnType<typeof vi.fn>
        ).mock.calls[0][0];
        await downloadHandler(mockSurveyModel, mockDownloadOptions);
      });

      expect(mockDownloadOptions.callback).toHaveBeenCalledWith("error");
    });

    it("should use URL directly when storage is not private", async () => {
      // Create a config with isPrivate = false
      const publicStorageConfig = {
        ...mockStorageConfig,
        isPrivate: false,
      };

      const props = createHookProps();

      let result: ReturnType<typeof renderHook>["result"];
      await act(async () => {
        const view = renderHook(() => useStorageUpload(props), {
          wrapper: createWrapper(publicStorageConfig),
        });
        result = view.result;
        await Promise.resolve();
      });

      // Mock the file fetch (not read-token API)
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        blob: () =>
          Promise.resolve(new Blob(["test"], { type: "application/pdf" })),
      });

      await act(async () => {
        (
          result.current as ReturnType<typeof useStorageUpload>
        ).registerUploadHandlers(mockSurveyModel);
        const downloadHandler = (
          mockSurveyModel.onDownloadFile.add as ReturnType<typeof vi.fn>
        ).mock.calls[0][0];
        await downloadHandler(mockSurveyModel, mockDownloadOptions);
      });

      // Should NOT call read-token API when storage is not private
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.blob.core.windows.net/user-files/test.pdf",
      );

      // Wait for FileReader async operation
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      expect(mockDownloadOptions.callback).toHaveBeenCalledWith(
        "success",
        "data:application/pdf;base64,test",
      );
    });

    it("should handle network errors when fetching file", async () => {
      const props = createHookProps();

      let result: ReturnType<typeof renderHook>["result"];
      await act(async () => {
        const view = renderHook(() => useStorageUpload(props), {
          wrapper: createWrapper(mockStorageConfig),
        });
        result = view.result;
        await Promise.resolve();
      });

      // Mock successful read-token but failed file fetch
      const fileUrl = "https://test.blob.core.windows.net/user-files/test.pdf";
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              resolved: {
                [fileUrl]: {
                  url: `${fileUrl}?on-demand-token-123`,
                },
              },
            }),
        })
        .mockRejectedValue(new Error("Network error"));

      await act(async () => {
        (
          result.current as ReturnType<typeof useStorageUpload>
        ).registerUploadHandlers(mockSurveyModel);
        const downloadHandler = (
          mockSurveyModel.onDownloadFile.add as ReturnType<typeof vi.fn>
        ).mock.calls[0][0];
        await downloadHandler(mockSurveyModel, mockDownloadOptions);
      });

      expect(mockDownloadOptions.callback).toHaveBeenCalledWith("error");
    });
  });

  describe("uploadToBlob edge cases", () => {
    it("should handle empty files array", async () => {
      const uploadOptions: UploadFilesEvent = {
        files: [],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(uploadOptions.callback).toHaveBeenCalledWith([], []);
    });

    it("should handle SAS token API failure", async () => {
      const uploadOptions: UploadFilesEvent = {
        files: [mockLargeFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "SAS token generation failed" }),
      });

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(uploadOptions.callback).toHaveBeenCalledWith(
        [],
        ["SAS token generation failed"],
      );
    });

    it("should handle missing SAS token for a file", async () => {
      const uploadOptions: UploadFilesEvent = {
        files: [mockLargeFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            uploads: {
              "large-video.mp4": {
                error: "File not allowed",
              },
            },
          }),
      });

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(uploadOptions.callback).toHaveBeenCalledWith(
        [],
        ["File not allowed"],
      );
    });

    it("should handle individual file upload failure", async () => {
      const fileToUpload = createFileWithArrayBuffer(
        "large-video.mp4",
        "video/mp4",
      );
      const uploadOptions: UploadFilesEvent = {
        files: [fileToUpload],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      const uploadError = new Error("Upload failed");
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              uploads: {
                "large-video.mp4": {
                  url: "https://test.blob.core.windows.net/large?sas-token",
                  headers: { "x-ms-blob-type": "BlockBlob" },
                  key: "mock/blob-key",
                },
              },
            }),
        })
        .mockRejectedValueOnce(uploadError);

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      // Act
      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      // Assert
      const callbackSucessses: any[] = [];
      const callbackErrors = [processUploadError(uploadError)];
      expect(uploadOptions.callback).toHaveBeenCalledWith(
        callbackSucessses,
        callbackErrors,
      );
    });

    it("should handle submission ID change from SAS token response", async () => {
      const uploadOptions: UploadFilesEvent = {
        files: [mockLargeFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              submissionId: "new-submission-id",
              uploads: {
                "large-video.mp4": {
                  url: "https://test.blob.core.windows.net/large?sas-token",
                  headers: { "x-ms-blob-type": "BlockBlob" },
                  key: "mock/blob-key",
                },
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(""),
        });

      const { result } = renderHook(
        () =>
          useStorageUpload(
            createHookProps({
              submissionId: mockSubmissionId,
              onSubmissionIdChange: mockOnSubmissionIdChange,
            }),
          ),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(mockOnSubmissionIdChange).toHaveBeenCalledWith(
        "new-submission-id",
      );
    });
  });

  describe("upload (SAS + resize) edge cases", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should handle empty files array", async () => {
      const uploadOptions: UploadFilesEvent = {
        files: [],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(uploadOptions.callback).toHaveBeenCalledWith([], []);
    });

    it("should handle SAS token API errors", async () => {
      const uploadOptions: UploadFilesEvent = {
        files: [mockFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(uploadOptions.callback).toHaveBeenCalledWith(
        [],
        expect.arrayContaining([expect.any(String)]),
      );
    });

    it("should handle submission ID change from SAS token response", async () => {
      const uploadOptions: UploadFilesEvent = {
        files: [mockFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              submissionId: "new-submission-id",
              uploads: {
                "test.jpg": {
                  url: "https://test.blob.core.windows.net/test?sas-token",
                  headers: { "x-ms-blob-type": "BlockBlob" },
                  key: "mock/blob-key",
                },
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          headers: new Headers({ "Content-Type": "image/jpeg" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(""),
        });

      const { result } = renderHook(
        () =>
          useStorageUpload(
            createHookProps({
              submissionId: mockSubmissionId,
              onSubmissionIdChange: mockOnSubmissionIdChange,
            }),
          ),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(mockOnSubmissionIdChange).toHaveBeenCalledWith(
        "new-submission-id",
      );
    });

    it("should pass blob URL to callback after resize and upload", async () => {
      const uploadOptions: UploadFilesEvent = {
        files: [mockFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              uploads: {
                "test.jpg": {
                  url: "https://test.blob.core.windows.net/test?sas-token",
                  headers: { "x-ms-blob-type": "BlockBlob" },
                  key: "mock/blob-key",
                },
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
          headers: new Headers({ "Content-Type": "image/jpeg" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(""),
        });

      const { result } = renderHook(
        () =>
          useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
        {
          wrapper: createWrapper(),
        },
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(uploadOptions.callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            file: mockFile,
            content: "https://test.blob.core.windows.net/test",
          }),
        ]),
        [],
      );
    });
  });
});

/**
 * Creates mock file with array buffer.
 * @param fileName - The name of the file e.g. "test.jpg", "large-video.mp4", "document.pdf".
 * @param contentType - The content type of the file e.g. "image/jpeg", "video/mp4", "application/pdf".
 * @param content - The content of the file. Optional, if not provided, the file content will be the fileName.
 * @returns A file with an array buffer.
 */
function createFileWithArrayBuffer(
  fileName: string,
  contentType: string,
  content?: string,
) {
  const fileContent = content ?? fileName;
  const fileWithArrayBuffer = new File([fileContent], fileName, {
    type: contentType,
  });

  Object.defineProperty(fileWithArrayBuffer, "arrayBuffer", {
    value: () => Promise.resolve(new ArrayBuffer(0)),
    writable: false,
  });

  return fileWithArrayBuffer;
}
