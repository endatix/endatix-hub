import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  uploadBlob,
  resizeImageOrFallback,
} from "@/features/asset-storage/use-cases/upload/upload-blob";
import {
  UploadError,
} from "@/features/asset-storage/use-cases/upload/upload-errors";

global.fetch = vi.fn();

describe("uploadBlob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads data via fetch PUT and returns base URL without query", async () => {
    const sasUrl =
      "https://account.blob.core.windows.net/container/file.pdf?sv=2020&sig=abc";
    const data = new ArrayBuffer(8);
    const headers = {
      "x-ms-blob-type": "BlockBlob",
      "x-ms-blob-content-type": "application/pdf",
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });

    const url = await uploadBlob(sasUrl, data, headers);

    expect(url).toBe(
      "https://account.blob.core.windows.net/container/file.pdf",
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      sasUrl,
      expect.objectContaining({
        method: "PUT",
        body: data,
        headers,
      }),
    );
  });

  it("returns full URL when no query string", async () => {
    const sasUrl = "https://account.blob.core.windows.net/container/file.pdf";
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });

    const url = await uploadBlob(sasUrl, new ArrayBuffer(0), {});

    expect(url).toBe(sasUrl);
  });

  it("throws UploadError when fetch returns not ok", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: () => Promise.resolve("body"),
    });

    await expect(
      uploadBlob("https://x/y?s=1", new ArrayBuffer(0), {}),
    ).rejects.toThrow(UploadError);

    try {
      await uploadBlob("https://x/y?s=1", new ArrayBuffer(0), {});
    } catch (err) {
      expect(err).toBeInstanceOf(UploadError);
      expect((err as UploadError).fileUrl).toBe("https://x/y?s=1");
    }
  });

  it("throws UploadError when fetch rejects", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error"),
    );

    await expect(
      uploadBlob("https://x/y?s=1", new ArrayBuffer(0), {}),
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
