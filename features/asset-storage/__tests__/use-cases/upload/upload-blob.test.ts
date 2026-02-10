import { describe, it, expect, vi, beforeEach } from "vitest";
import { RestError } from "@azure/storage-blob";
import {
  uploadBlob,
  resizeImageOrFallback,
} from "@/features/asset-storage/use-cases/upload/upload-blob";
import {
  UploadError,
  UploadUnauthorizedError,
  UploadBlockedError,
} from "@/features/asset-storage/use-cases/upload/upload-errors";

const mockUploadData = vi.fn();

vi.mock("@azure/storage-blob", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@azure/storage-blob")>();
  return {
    ...mod,
    BlockBlobClient: vi.fn().mockImplementation(() => ({
      uploadData: mockUploadData,
    })),
  };
});

global.fetch = vi.fn();

describe("uploadBlob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadData.mockResolvedValue(undefined);
  });

  it("uploads data and returns base URL without query", async () => {
    const sasUrl =
      "https://account.blob.core.windows.net/container/file.pdf?sv=2020&sig=abc";
    const data = new ArrayBuffer(8);
    const options = {
      metadata: { fileName: "file.pdf", uploadedBy: "user-1" },
      blobHTTPHeaders: { blobContentType: "application/pdf" },
    };

    const url = await uploadBlob(sasUrl, data, options);

    expect(url).toBe(
      "https://account.blob.core.windows.net/container/file.pdf",
    );
    expect(mockUploadData).toHaveBeenCalledTimes(1);
    expect(mockUploadData).toHaveBeenCalledWith(
      data,
      expect.objectContaining({
        metadata: options.metadata,
        blobHTTPHeaders: options.blobHTTPHeaders,
      }),
    );
  });

  it("returns full URL when no query string", async () => {
    const sasUrl = "https://account.blob.core.windows.net/container/file.pdf";
    const url = await uploadBlob(sasUrl, new ArrayBuffer(0), {
      metadata: {},
      blobHTTPHeaders: {},
    });

    expect(url).toBe(sasUrl);
  });

  it("throws UploadError when uploadData rejects with generic Error", async () => {
    mockUploadData.mockRejectedValue(new Error("Network error"));

    await expect(
      uploadBlob("https://x/y?s=1", new ArrayBuffer(0), {
        metadata: {},
        blobHTTPHeaders: {},
      }),
    ).rejects.toThrow(UploadError);

    try {
      await uploadBlob("https://x/y?s=1", new ArrayBuffer(0), {
        metadata: {},
        blobHTTPHeaders: {},
      });
    } catch (err) {
      expect(err).toBeInstanceOf(UploadError);
      expect((err as UploadError).message).toBe("Network error");
      expect((err as UploadError).fileUrl).toBe("https://x/y?s=1");
    }
  });

  it("throws UploadUnauthorizedError when uploadData rejects with RestError 403 and AuthenticationFailed", async () => {
    const restError = new RestError("Authentication failed", {
      statusCode: 403,
      code: "AuthenticationFailed",
    });
    mockUploadData.mockRejectedValue(restError);

    await expect(
      uploadBlob("https://account.blob/core/file?sv=1", new ArrayBuffer(0), {
        metadata: {},
        blobHTTPHeaders: {},
      }),
    ).rejects.toThrow(UploadUnauthorizedError);
  });

  it("throws UploadBlockedError when uploadData rejects with RestError 403 without AuthenticationFailed", async () => {
    const restError = new RestError("Forbidden", { statusCode: 403 });
    mockUploadData.mockRejectedValue(restError);

    await expect(
      uploadBlob("https://account.blob/core/file?sv=1", new ArrayBuffer(0), {
        metadata: {},
        blobHTTPHeaders: {},
      }),
    ).rejects.toThrow(UploadBlockedError);
  });

  it("throws UploadError when uploadData rejects with RestError other status", async () => {
    const restError = new RestError("Bad request", { statusCode: 400 });
    mockUploadData.mockRejectedValue(restError);

    await expect(
      uploadBlob("https://x/y?s=1", new ArrayBuffer(0), {
        metadata: {},
        blobHTTPHeaders: {},
      }),
    ).rejects.toThrow(UploadError);
  });
});

describe("resizeImageOrFallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns original buffer and fileState original when not image", async () => {
    const file = new File(["data"], "doc.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(file, "arrayBuffer", {
      value: () => Promise.resolve(new ArrayBuffer(4)),
      writable: false,
    });

    const result = await resizeImageOrFallback(
      file,
      "https://example.com/resize",
    );

    expect(result).toEqual({
      buffer: new ArrayBuffer(4),
      contentType: "application/pdf",
      fileState: "original",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls resize API and returns optimized result when ok", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "img.png", {
      type: "image/png",
    });
    const responseBuffer = new ArrayBuffer(2);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(responseBuffer),
      headers: new Headers({ "Content-Type": "image/png" }),
    });

    const result = await resizeImageOrFallback(
      file,
      "https://example.com/resize",
    );

    expect(result).toEqual({
      buffer: responseBuffer,
      contentType: "image/png",
      fileState: "optimized",
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/resize",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }),
    );
  });

  it("throws with API message when resize returns not ok", async () => {
    const file = new File([new Uint8Array(1)], "img.png", {
      type: "image/png",
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
      json: () =>
        Promise.resolve({
          detail: "File must be an image.",
          error: "validation_error",
        }),
    });

    await expect(
      resizeImageOrFallback(file, "https://example.com/resize"),
    ).rejects.toThrow("File must be an image.");
  });

  it("throws with statusText when response has no detail/error", async () => {
    const file = new File([new Uint8Array(1)], "img.png", {
      type: "image/png",
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({}),
    });

    await expect(
      resizeImageOrFallback(file, "https://example.com/resize"),
    ).rejects.toThrow();
  });
});
