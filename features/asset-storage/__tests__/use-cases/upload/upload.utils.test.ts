import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/lib/result";
import {
  fetchUploadUrls,
  prepareUploadBytes,
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

const sampleDescriptor = {
  url: "https://example.com/a?sas",
  key: "folder/a.pdf",
  headers: { "x-ms-blob-type": "BlockBlob" as const },
};

describe("fetchUploadUrls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success with data when response is ok", async () => {
    const data: UploadUrlsData = {
      uploads: {
        "a.pdf": sampleDescriptor,
      },
      userId: "user-1",
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(data),
    });

    const result = await fetchUploadUrls("/api/upload-urls", {
      fileNames: ["a.pdf"],
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual(data);
      expect(result.value.uploads["a.pdf"]).toEqual(sampleDescriptor);
    }
  });

  it("returns error when response is not ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({ detail: "Validation failed", error: "Bad request" }),
    });

    const result = await fetchUploadUrls("/api/upload-urls", {});

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

    const result = await fetchUploadUrls("/api/upload-urls", {});

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Failed to generate upload URLs");
    }
  });

  it("returns error when fetch throws", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error"),
    );

    const result = await fetchUploadUrls("/api/upload-urls", {});

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Network error");
    }
  });
});

describe("prepareUploadBytes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResizeImageOrFallback.mockResolvedValue({
      buffer: new ArrayBuffer(0),
      contentType: "image/png",
      fileState: "optimized",
    });
  });

  it("reads arrayBuffer when resize URL is omitted", async () => {
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "arrayBuffer", {
      value: () => Promise.resolve(new ArrayBuffer(8)),
      writable: false,
    });

    const out = await prepareUploadBytes(file, undefined);
    expect(out.buffer.byteLength).toBe(8);
    expect(out.contentType).toBe("application/pdf");
    expect(out.fileState).toBe("original");
    expect(mockResizeImageOrFallback).not.toHaveBeenCalled();
  });

  it("calls resize for small images when resize URL is set", async () => {
    const file = new File([new Uint8Array(10)], "img.png", {
      type: "image/png",
    });
    Object.defineProperty(file, "size", { value: 100, writable: false });

    const out = await prepareUploadBytes(file, "/api/resize");
    expect(mockResizeImageOrFallback).toHaveBeenCalledWith(file, "/api/resize");
    expect(out.contentType).toBe("image/png");
    expect(out.fileState).toBe("optimized");
  });

  it("keeps SVG uploads as original bytes", async () => {
    const file = new File(["<svg />"], "logo.svg", {
      type: "image/svg+xml",
    });

    const out = await prepareUploadBytes(file, "/api/resize");

    expect(out.contentType).toBe("image/svg+xml");
    expect(out.fileState).toBe("original");
    expect(mockResizeImageOrFallback).not.toHaveBeenCalled();
  });
});

describe("processAndUploadFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadBlob.mockResolvedValue("https://example.com/container/doc.pdf");
  });

  it("returns success with url and file when upload succeeds", async () => {
    const file = new File(["content"], "doc.pdf", {
      type: "application/pdf",
    });
    const buffer = new ArrayBuffer(8);

    const result = await processAndUploadFile(file, sampleDescriptor, buffer);

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.url).toBe("https://example.com/container/doc.pdf");
      expect(result.value.file).toBe(file);
    }
    expect(mockUploadBlob).toHaveBeenCalledTimes(1);
    expect(mockUploadBlob).toHaveBeenCalledWith(
      sampleDescriptor.url,
      buffer,
      sampleDescriptor.headers,
    );
  });

  it("returns error when uploadBlob throws", async () => {
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    mockUploadBlob.mockRejectedValue(new Error("Upload failed"));

    const result = await processAndUploadFile(
      file,
      sampleDescriptor,
      new ArrayBuffer(1),
    );

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Upload failed");
    }
  });
});
