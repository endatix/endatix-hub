import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/lib/result";
import {
  createUserUpload,
  createContentUpload,
  type UserUploadConfig,
  type ContentUploadConfig,
} from "@/features/asset-storage/use-cases/upload/upload-handler.factory";
import type {
  UploadUrlsData,
  ProcessAndUploadSuccess,
} from "@/features/asset-storage/use-cases/upload/upload.utils";
import { SurveyModel, UploadFilesEvent } from "survey-core";
import { UploadFileEvent } from "survey-creator-core";

const { mockFetchUploadUrls, mockProcessAndUploadFile } = vi.hoisted(() => ({
  mockFetchUploadUrls: vi.fn(),
  mockProcessAndUploadFile: vi.fn(),
}));

vi.mock("@/features/asset-storage/use-cases/upload/upload.utils", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/asset-storage/use-cases/upload/upload.utils")
  >("@/features/asset-storage/use-cases/upload/upload.utils");
  return {
    ...actual,
    fetchUploadUrls: (...args: unknown[]) => mockFetchUploadUrls(...args),
    processAndUploadFile: (...args: unknown[]) =>
      mockProcessAndUploadFile(...args),
  };
});

describe("createUserUpload", () => {
  const userConfig: UserUploadConfig = {
    formId: "form-1",
    getSubmissionId: () => "sub-1",
    surveyModel: { locale: "en" } as unknown as SurveyModel,
    onSubmissionIdChange: vi.fn(),
    isResizeEnabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls callback with empty data and errors when no files", async () => {
    const callback = vi.fn();
    const handler = createUserUpload(userConfig);

    await handler(
      {} as Parameters<typeof handler>[0],
      { files: [], callback } as unknown as UploadFilesEvent,
    );

    expect(callback).toHaveBeenCalledWith([], []);
    expect(mockFetchUploadUrls).not.toHaveBeenCalled();
  });

  it("calls callback with error when fetchUploadUrls returns error", async () => {
    mockFetchUploadUrls.mockResolvedValue(
      Result.error("Failed to generate upload URLs"),
    );
    const callback = vi.fn();
    const handler = createUserUpload(userConfig);
    const file = new File(["x"], "a.pdf", { type: "application/pdf" });

    await handler(
      {} as Parameters<typeof handler>[0],
      {
        files: [file],
        callback,
        question: { name: "q1" },
      } as unknown as UploadFilesEvent,
    );

    expect(callback).toHaveBeenCalledWith(
      [],
      ["Failed to generate upload URLs"],
    );
    expect(mockFetchUploadUrls).toHaveBeenCalledWith(
      "/api/public/v0/storage/upload-urls",
      expect.objectContaining({
        fileNames: ["a.pdf"],
        formId: "form-1",
        submissionId: "sub-1",
        formLocale: "en",
        fileTypes: { "a.pdf": "application/pdf" },
        fileStates: { "a.pdf": "original" },
        questionName: "q1",
      }),
    );
  });

  it("includes public storage gate token data when runtime is available", async () => {
    mockFetchUploadUrls.mockResolvedValue(Result.error("Forbidden"));
    const callback = vi.fn();
    const handler = createUserUpload({
      ...userConfig,
      getReadRuntime: () => ({
        policyName: "public",
        formId: "form-1",
        submissionId: "sub-1",
        token: "sub-1.1781332119.s.signature",
        tokenType: "AccessToken",
      }),
    });
    const file = new File(["x"], "a.pdf", { type: "application/pdf" });

    await handler(
      {} as Parameters<typeof handler>[0],
      {
        files: [file],
        callback,
        question: { name: "q1" },
      } as unknown as UploadFilesEvent,
    );

    expect(mockFetchUploadUrls).toHaveBeenCalledWith(
      "/api/public/v0/storage/upload-urls",
      expect.objectContaining({
        formId: "form-1",
        submissionId: "sub-1",
        token: "sub-1.1781332119.s.signature",
        tokenType: "AccessToken",
      }),
    );
  });

  it("calls onSubmissionIdChange when SAS returns new submissionId", async () => {
    const sasData: UploadUrlsData = {
      uploads: {
        "a.pdf": {
          url: "https://storage.blob/core/file?sas",
          headers: { "x-ms-blob-type": "BlockBlob" },
          key: "k",
        },
      },
      submissionId: "sub-new",
      userId: "user-1",
    };
    mockFetchUploadUrls.mockResolvedValue(Result.success(sasData));
    mockProcessAndUploadFile.mockResolvedValue(
      Result.success({
        url: "https://storage.blob/core/file",
        file: new File(["x"], "a.pdf", { type: "application/pdf" }),
      } as ProcessAndUploadSuccess),
    );
    const callback = vi.fn();
    const onSubmissionIdChange = vi.fn();
    const handler = createUserUpload({
      ...userConfig,
      onSubmissionIdChange,
    });
    const file = new File(["x"], "a.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "arrayBuffer", {
      value: () => Promise.resolve(new ArrayBuffer(1)),
      writable: false,
    });

    await handler(
      {} as Parameters<typeof handler>[0],
      {
        files: [file],
        callback,
        question: { name: "q1" },
      } as unknown as UploadFilesEvent,
    );

    expect(onSubmissionIdChange).toHaveBeenCalledWith("sub-new");
    expect(callback).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          file,
          content: "https://storage.blob/core/file",
        }),
      ]),
      [],
    );
  });

  it("calls callback with error when token missing for file", async () => {
    const sasData: UploadUrlsData = {
      uploads: {
        "a.pdf": { error: "No URL for a.pdf" },
      },
      userId: "user-1",
    };
    mockFetchUploadUrls.mockResolvedValue(Result.success(sasData));
    const callback = vi.fn();
    const handler = createUserUpload(userConfig);
    const file = new File(["x"], "a.pdf", { type: "application/pdf" });

    await handler(
      {} as Parameters<typeof handler>[0],
      {
        files: [file],
        callback,
        question: { name: "q1" },
      } as unknown as UploadFilesEvent,
    );

    expect(callback).toHaveBeenCalledWith(
      [],
      expect.arrayContaining([expect.stringContaining("a.pdf")]),
    );
  });
});

describe("createContentUpload", () => {
  const contentConfig: ContentUploadConfig = {
    itemId: "item-1",
    itemType: "form",
    questionName: "q1",
    isResizeEnabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when files array is empty", async () => {
    const callback = vi.fn();
    const handler = createContentUpload(contentConfig);

    await handler(
      {} as Parameters<typeof handler>[0],
      { files: [], callback } as unknown as UploadFileEvent,
    );

    expect(callback).not.toHaveBeenCalled();
    expect(mockFetchUploadUrls).not.toHaveBeenCalled();
  });

  it("calls callback error when fetchUploadUrls returns error", async () => {
    mockFetchUploadUrls.mockResolvedValue(
      Result.error("SAS generation failed"),
    );
    const callback = vi.fn();
    const handler = createContentUpload(contentConfig);
    const file = new File(["x"], "img.png", { type: "image/png" });

    await handler(
      {} as Parameters<typeof handler>[0],
      { files: [file], callback } as unknown as UploadFileEvent,
    );

    expect(callback).toHaveBeenCalledWith("error", "SAS generation failed");
  });

  it("calls callback success with first URL when uploads succeed", async () => {
    const sasData: UploadUrlsData = {
      uploads: {
        "img.png": {
          url: "https://storage.blob/core/img?sas",
          headers: { "x-ms-blob-type": "BlockBlob" },
          key: "k",
        },
      },
      uploadMetadata: {
        userId: "user-1",
        itemId: "item-1",
        contentItemType: "form",
        questionName: "q1",
      },
    };
    mockFetchUploadUrls.mockResolvedValue(Result.success(sasData));
    const file = new File([new Uint8Array(1)], "img.png", {
      type: "image/png",
    });
    mockProcessAndUploadFile.mockResolvedValue(
      Result.success({
        url: "https://storage.blob/core/img",
        file,
      } as ProcessAndUploadSuccess),
    );
    const callback = vi.fn();
    const handler = createContentUpload(contentConfig);

    await handler(
      {} as Parameters<typeof handler>[0],
      { files: [file], callback } as unknown as UploadFileEvent,
    );

    expect(callback).toHaveBeenCalledWith(
      "success",
      "https://storage.blob/core/img",
    );
  });

  it("calls callback error when processAndUploadFile returns error", async () => {
    const sasData: UploadUrlsData = {
      uploads: {
        "img.png": {
          url: "https://storage.blob/core/img?sas",
          headers: { "x-ms-blob-type": "BlockBlob" },
          key: "k",
        },
      },
      uploadMetadata: {
        userId: "user-1",
        itemId: "item-1",
        contentItemType: "form",
        questionName: "q1",
      },
    };
    mockFetchUploadUrls.mockResolvedValue(Result.success(sasData));
    mockProcessAndUploadFile.mockResolvedValue(
      Result.error("Could not upload file: img.png. Upload failed"),
    );
    const callback = vi.fn();
    const handler = createContentUpload(contentConfig);
    const file = new File([new Uint8Array(1)], "img.png", {
      type: "image/png",
    });

    await handler(
      {} as Parameters<typeof handler>[0],
      { files: [file], callback } as unknown as UploadFileEvent,
    );

    expect(callback).toHaveBeenCalledWith(
      "error",
      "Could not upload file: img.png. Upload failed",
    );
  });
});
