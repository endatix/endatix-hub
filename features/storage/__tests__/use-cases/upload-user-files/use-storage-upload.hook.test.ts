import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStorageUpload } from "@/features/storage/client";
import {
  SurveyModel,
  UploadFilesEvent,
  ClearFilesEvent,
  DownloadFileEvent,
} from "survey-core";
import { BlockBlobClient } from "@azure/storage-blob";
import { Result } from "@/lib/result";

// Mock fetch globally
global.fetch = vi.fn();

// Mock BlockBlobClient
vi.mock("@azure/storage-blob", async () => {
  const actual = await vi.importActual<typeof import("@azure/storage-blob")>(
    "@azure/storage-blob",
  );
  return {
    ...actual,
    BlockBlobClient: vi.fn(),
  };
});

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

  const createHookProps = (
    overrides?: Partial<Parameters<typeof useStorageUpload>[0]>,
  ) => ({
    formId: mockFormId,
    surveyModel: mockSurveyModel,
    readTokenPromises: createDefaultReadTokenPromises(),
    ...overrides,
  });

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
    vi.restoreAllMocks();
  });

  describe("hook initialization", () => {
    it("should initialize with default submissionId", async () => {
      const props = createHookProps();
      let result: ReturnType<typeof renderHook>["result"];

      // eslint-disable-next-line testing-library/no-unnecessary-act
      await act(async () => {
        const view = renderHook(() => useStorageUpload(props));
        result = view.result;
        // Await promises to ensure they're processed within act
        await props.readTokenPromises.userFiles;
        await props.readTokenPromises.content;
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

      // eslint-disable-next-line testing-library/no-unnecessary-act
      await act(async () => {
        const view = renderHook(() => useStorageUpload(props));
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
      const { result } = renderHook(() =>
        useStorageUpload(
          createHookProps({
            submissionId: mockSubmissionId,
            onSubmissionIdChange: mockOnSubmissionIdChange,
          }),
        ),
      );

      await act(async () => {
        result.current.registerUploadHandlers(mockSurveyModel);
      });

      expect(mockSurveyModel.onUploadFiles.add).toHaveBeenCalledTimes(1);
      expect(mockSurveyModel.onClearFiles.add).toHaveBeenCalledTimes(1);
      expect(mockSurveyModel.onDownloadFile.add).toHaveBeenCalledTimes(1);
    });

    it("should return cleanup function from registerUploadHandlers", async () => {
      const { result } = renderHook(() => useStorageUpload(createHookProps()));

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
      // Mock successful fetch responses
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            sasTokens: {
              "test.jpg": {
                success: true,
                url: "https://test.blob.core.windows.net/test?sas-token",
              },
            },
          }),
      });

      // Mock BlockBlobClient
      const mockUploadData = vi.fn().mockResolvedValue(undefined);
      (BlockBlobClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        uploadData: mockUploadData,
      }));
    });

    it("should upload small image files to server for resizing", async () => {
      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, mockUploadOptions);
      });

      // Should call server upload endpoint for small images
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/upload",
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData),
          headers: expect.objectContaining({
            "edx-form-id": mockFormId,
            "edx-submission-id": mockSubmissionId,
            "edx-form-lang": "en",
          }),
        }),
      );
    });

    it("should upload large files directly to blob storage", async () => {
      const largeFileOptions: UploadFilesEvent = {
        files: [mockLargeFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, largeFileOptions);
      });

      // Should call SAS token endpoint for large files
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/sas-token",
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

      // Mock both endpoints
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              sasTokens: {
                "large-video.mp4": {
                  success: true,
                  url: "https://test.blob.core.windows.net/large?sas-token",
                },
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [
                {
                  name: "test.jpg",
                  url: "https://test.blob.core.windows.net/test",
                },
              ],
            }),
        });

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, mixedFilesOptions);
      });

      // Should call both endpoints
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/sas-token",
        expect.any(Object),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/upload",
        expect.any(Object),
      );
    });

    it("should handle upload errors gracefully", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
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
      const mockCallback = vi.fn();
      const uploadOptions: UploadFilesEvent = {
        files: [mockFile],
        callback: mockCallback,
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              {
                name: "test.jpg",
                url: "https://test.blob.core.windows.net/test",
              },
            ],
          }),
      });

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(mockCallback).toHaveBeenCalledWith(
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
      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
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

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
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

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
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

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
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
      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
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

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
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

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
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

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
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

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              {
                name: "small.jpg",
                url: "https://test.blob.core.windows.net/small",
              },
            ],
          }),
      });

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      // Should call server upload endpoint
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/upload",
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
            sasTokens: {
              "large.jpg": {
                success: true,
                url: "https://test.blob.core.windows.net/large?sas-token",
              },
            },
          }),
      });

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      // Should call SAS token endpoint
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/sas-token",
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
            sasTokens: {
              "document.pdf": {
                success: true,
                url: "https://test.blob.core.windows.net/document?sas-token",
              },
            },
          }),
      });

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      // Should call SAS token endpoint for non-image files
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/public/v0/storage/sas-token",
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

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            submissionId: "new-submission-id",
            files: [
              {
                name: "test.jpg",
                url: "https://test.blob.core.windows.net/test",
              },
            ],
          }),
      });

      const { result } = renderHook(() =>
        useStorageUpload(
          createHookProps({
            submissionId: mockSubmissionId,
            onSubmissionIdChange: mockOnSubmissionIdChange,
          }),
        ),
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

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            submissionId: mockSubmissionId, // Same as current
            files: [
              {
                name: "test.jpg",
                url: "https://test.blob.core.windows.net/test",
              },
            ],
          }),
      });

      const { result } = renderHook(() =>
        useStorageUpload(
          createHookProps({
            submissionId: mockSubmissionId,
            onSubmissionIdChange: mockOnSubmissionIdChange,
          }),
        ),
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

    it("should download file with token when token is available", async () => {
      const tokenResult = Result.success({
        token: "test-token-123",
        containerName: "user-files",
        expiresOn: new Date(),
        generatedAt: new Date(),
      });

      const userFiles = Promise.resolve(tokenResult);
      const props = createHookProps({
        readTokenPromises: {
          userFiles,
          content: sharedResolvedPromise,
        },
      });

      let result: ReturnType<typeof renderHook>["result"];
      await act(async () => {
        const view = renderHook(() => useStorageUpload(props));
        result = view.result;
        await Promise.resolve();
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        blob: () =>
          Promise.resolve(new Blob(["test"], { type: "application/pdf" })),
      });

      await act(async () => {
        result.current.registerUploadHandlers(mockSurveyModel);
        const downloadHandler = (
          mockSurveyModel.onDownloadFile.add as ReturnType<typeof vi.fn>
        ).mock.calls[0][0];
        await downloadHandler(mockSurveyModel, mockDownloadOptions);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.blob.core.windows.net/user-files/test.pdf?test-token-123",
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

    it("should download file without token when token is not available", async () => {
      const { result } = renderHook(() => useStorageUpload(createHookProps()));

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        blob: () =>
          Promise.resolve(new Blob(["test"], { type: "application/pdf" })),
      });

      await act(async () => {
        await result.current.registerUploadHandlers(mockSurveyModel);
        const downloadHandler = (
          mockSurveyModel.onDownloadFile.add as ReturnType<typeof vi.fn>
        ).mock.calls[0][0];
        await downloadHandler(mockSurveyModel, mockDownloadOptions);
      });

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

    it("should handle download errors", async () => {
      const { result } = renderHook(() => useStorageUpload(createHookProps()));

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      await act(async () => {
        await result.current.registerUploadHandlers(mockSurveyModel);
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

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
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

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
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
            sasTokens: {
              "large-video.mp4": {
                success: false,
                message: "File not allowed",
              },
            },
          }),
      });

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
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
      const uploadOptions: UploadFilesEvent = {
        files: [mockLargeFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            sasTokens: {
              "large-video.mp4": {
                success: true,
                url: "https://test.blob.core.windows.net/large?sas-token",
              },
            },
          }),
      });

      const mockUploadData = vi
        .fn()
        .mockRejectedValue(new Error("Upload failed"));
      (BlockBlobClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        uploadData: mockUploadData,
      }));

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(uploadOptions.callback).toHaveBeenCalledWith(
        [],
        expect.arrayContaining([
          expect.stringContaining("Could not upload file: large-video.mp4"),
        ]),
      );
    });

    it("should handle submission ID change from SAS token response", async () => {
      const uploadOptions: UploadFilesEvent = {
        files: [mockLargeFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            submissionId: "new-submission-id",
            sasTokens: {
              "large-video.mp4": {
                success: true,
                url: "https://test.blob.core.windows.net/large?sas-token",
              },
            },
          }),
      });

      const mockUploadData = vi.fn().mockResolvedValue(undefined);
      (BlockBlobClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        uploadData: mockUploadData,
      }));

      const { result } = renderHook(() =>
        useStorageUpload(
          createHookProps({
            submissionId: mockSubmissionId,
            onSubmissionIdChange: mockOnSubmissionIdChange,
          }),
        ),
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(mockOnSubmissionIdChange).toHaveBeenCalledWith(
        "new-submission-id",
      );
    });
  });

  describe("uploadToServer edge cases", () => {
    it("should handle empty files array", async () => {
      const uploadOptions: UploadFilesEvent = {
        files: [],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(uploadOptions.callback).toHaveBeenCalledWith([], []);
    });

    it("should handle server upload API errors", async () => {
      const uploadOptions: UploadFilesEvent = {
        files: [mockFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(uploadOptions.callback).toHaveBeenCalledWith([], ["Server error"]);
    });

    it("should handle submission ID change from server upload response", async () => {
      const uploadOptions: UploadFilesEvent = {
        files: [mockFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            submissionId: "new-submission-id",
            files: [
              {
                name: "test.jpg",
                url: "https://test.blob.core.windows.net/test",
              },
            ],
          }),
      });

      const { result } = renderHook(() =>
        useStorageUpload(
          createHookProps({
            submissionId: mockSubmissionId,
            onSubmissionIdChange: mockOnSubmissionIdChange,
          }),
        ),
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(mockOnSubmissionIdChange).toHaveBeenCalledWith(
        "new-submission-id",
      );
    });

    it("should handle files with tokens from server response", async () => {
      const uploadOptions: UploadFilesEvent = {
        files: [mockFile],
        callback: vi.fn(),
      } as unknown as UploadFilesEvent;

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            files: [
              {
                name: "test.jpg",
                url: "https://test.blob.core.windows.net/test",
                token: "file-token-123",
              },
            ],
          }),
      });

      const { result } = renderHook(() =>
        useStorageUpload(createHookProps({ submissionId: mockSubmissionId })),
      );

      await act(async () => {
        await result.current.uploadFiles(mockSurveyModel, uploadOptions);
      });

      expect(uploadOptions.callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            file: mockFile,
            content: "https://test.blob.core.windows.net/test",
            token: "file-token-123",
          }),
        ]),
        [],
      );
    });
  });
});
