import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/lib/result";
import {
  fetchUploadUrls,
  processAndUploadFile,
  type UploadUrlsData,
} from "@/features/asset-storage/use-cases/upload/upload.utils";

const { mockUploadBlob, mockResizeImageOrFallback } = vi.hoisted(() => ({
  mockUploadBlob: vi.fn(),
  mockResizeImageOrFallback: vi.fn(),
}));

vi.mock("@/features/asset-storage/use-cases/upload/upload-blob", () => ({
  uploadBlob: (...args: unknown[]) => mockUploadBlob(...args),
  resizeImageOrFallback: (...args: unknown[]) =>
    mockResizeImageOrFallback(...args),
}));

global.fetch = vi.fn();

describe("fetchUploadUrls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success with data when response is ok", async () => {
    const data: UploadUrlsData = {
      sasTokens: {
        "a.pdf": { success: true, url: "https://example.com/a?sas" },
      },
      userId: "user-1",
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    });

    const result = await fetchUploadUrls("/api/sas", { fileNames: ["a.pdf"] });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual(data);
      expect(result.value.sasTokens["a.pdf"].url).toBe(
        "https://example.com/a?sas",
      );
    }
  });

  it("returns error when response is not ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({ detail: "Validation failed", error: "Bad request" }),
    });

    const result = await fetchUploadUrls("/api/sas", {});

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Validation failed");
    }
  });

  it("returns error when response has no detail/error", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const result = await fetchUploadUrls("/api/sas", {});

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Failed to generate upload URLs");
    }
  });

  it("returns error when fetch throws", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error"),
    );

    const result = await fetchUploadUrls("/api/sas", {});

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Network error");
    }
  });
});

describe("processAndUploadFile", () => {
  const userMeta = {
    kind: "user" as const,
    uploadedBy: "user-1",
    displayName: "doc.pdf",
    contentType: "application/pdf",
    formId: "f1",
    submissionId: "s1",
    formLang: "en",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadBlob.mockResolvedValue("https://example.com/container/doc.pdf");
    mockResizeImageOrFallback.mockResolvedValue({
      buffer: new ArrayBuffer(0),
      contentType: "image/png",
      fileState: "optimized",
    });
  });

  it("returns success with url and file when upload succeeds (no resize)", async () => {
    const file = new File(["content"], "doc.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(file, "arrayBuffer", {
      value: () => Promise.resolve(new ArrayBuffer(8)),
      writable: false,
    });

    const result = await processAndUploadFile(
      file,
      "https://example.com/sas",
      userMeta,
    );

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.url).toBe("https://example.com/container/doc.pdf");
      expect(result.value.file).toBe(file);
    }
    expect(mockResizeImageOrFallback).not.toHaveBeenCalled();
    expect(mockUploadBlob).toHaveBeenCalledTimes(1);
  });

  it("returns success when resize is used for image under threshold", async () => {
    const file = new File([new Uint8Array(10)], "img.png", {
      type: "image/png",
    });
    Object.defineProperty(file, "size", { value: 100, writable: false });

    const result = await processAndUploadFile(
      file,
      "https://example.com/sas",
      userMeta,
      "/api/resize",
    );

    expect(Result.isSuccess(result)).toBe(true);
    expect(mockResizeImageOrFallback).toHaveBeenCalledWith(file, "/api/resize");
    expect(mockUploadBlob).toHaveBeenCalledTimes(1);
  });

  it("returns error when uploadBlob throws", async () => {
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "arrayBuffer", {
      value: () => Promise.resolve(new ArrayBuffer(1)),
      writable: false,
    });
    mockUploadBlob.mockRejectedValue(new Error("Upload failed"));

    const result = await processAndUploadFile(
      file,
      "https://example.com/sas",
      userMeta,
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Upload failed");
    }
  });

  it("returns error when resize throws", async () => {
    const file = new File([new Uint8Array(10)], "img.png", {
      type: "image/png",
    });
    Object.defineProperty(file, "size", { value: 100, writable: false });
    mockResizeImageOrFallback.mockRejectedValue(new Error("Resize failed"));

    const result = await processAndUploadFile(
      file,
      "https://example.com/sas",
      userMeta,
      "/api/resize",
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Resize failed");
    }
  });
});
