import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleResizeImageRequest } from "@/features/asset-storage/use-cases/resize-image/resize-image.handler";
import * as imageService from "@/features/asset-storage/infrastructure/image-service";

vi.mock("@/features/asset-storage/infrastructure/image-service", () => {
  const mockConfig = {
    isResizeEnabled: true,
    defaultResizeWidth: 800,
  };
  return {
    optimizeImageSize: vi.fn(),
    get IMAGE_SERVICE_CONFIG() {
      return mockConfig;
    },
  };
});

describe("handleResizeImageRequest", () => {
  const mockOptimizedBuffer = Buffer.from("optimized");
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(imageService.optimizeImageSize).mockResolvedValue(
      mockOptimizedBuffer,
    );
    // Ensure resize is enabled by default for most tests
    (
      imageService.IMAGE_SERVICE_CONFIG as { isResizeEnabled: boolean }
    ).isResizeEnabled = true;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns 400 when form data has no 'file' field", async () => {
    const formData = new FormData();
    const request = new Request("http://test/resize", {
      method: "POST",
      body: formData,
    });

    const response = await handleResizeImageRequest(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.detail).toBe(
      "Invalid or missing file. Send one image as multipart field 'file'.",
    );
    expect(imageService.optimizeImageSize).not.toHaveBeenCalled();
  });

  it("returns 400 when 'file' field is a string (e.g. text input)", async () => {
    const formData = new FormData();
    formData.append("file", "not-a-file");
    const request = new Request("http://test/resize", {
      method: "POST",
      body: formData,
    });

    const response = await handleResizeImageRequest(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.detail).toBe(
      "Invalid or missing file. Send one image as multipart field 'file'.",
    );
    expect(imageService.optimizeImageSize).not.toHaveBeenCalled();
  });

  it("returns 400 when file type is not an image", async () => {
    const file = new File(["content"], "doc.pdf", {
      type: "application/pdf",
    });
    const formData = new FormData();
    formData.append("file", file);
    const request = new Request("http://test/resize", {
      method: "POST",
      body: formData,
    });

    const response = await handleResizeImageRequest(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.detail).toBe("File must be an image.");
    expect(imageService.optimizeImageSize).not.toHaveBeenCalled();
  });

  it("returns 200 with optimized buffer and correct headers for a valid image", async () => {
    const file = new File([Buffer.from("image-bytes")], "photo.png", {
      type: "image/png",
    });
    const formData = new FormData();
    formData.append("file", file);
    const request = new Request("http://test/resize", {
      method: "POST",
      body: formData,
    });

    const response = await handleResizeImageRequest(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Content-Length")).toBe(
      String(mockOptimizedBuffer.length),
    );
    const arrayBuffer = await response.arrayBuffer();
    expect(Buffer.from(arrayBuffer).equals(mockOptimizedBuffer)).toBe(true);
    expect(imageService.optimizeImageSize).toHaveBeenCalledTimes(1);
    expect(imageService.optimizeImageSize).toHaveBeenCalledWith(
      expect.any(Buffer),
      "image/png",
    );
  });

  it("passes image buffer and content type to optimizeImageSize", async () => {
    const file = new File([Buffer.from("jpeg-data")], "photo.jpg", {
      type: "image/jpeg",
    });
    const formData = new FormData();
    formData.append("file", file);
    const request = new Request("http://test/resize", {
      method: "POST",
      body: formData,
    });

    await handleResizeImageRequest(request);

    expect(imageService.optimizeImageSize).toHaveBeenCalledTimes(1);
    const [bufferArg, contentTypeArg] = vi.mocked(
      imageService.optimizeImageSize,
    ).mock.calls[0];
    expect(Buffer.isBuffer(bufferArg)).toBe(true);
    expect(contentTypeArg).toBe("image/jpeg");
  });

  it("returns 400 when image resize is disabled", async () => {
    // Mock resize as disabled
    (
      imageService.IMAGE_SERVICE_CONFIG as { isResizeEnabled: boolean }
    ).isResizeEnabled = false;

    const file = new File([Buffer.from("image-bytes")], "photo.png", {
      type: "image/png",
    });
    const formData = new FormData();
    formData.append("file", file);
    const request = new Request("http://test/resize", {
      method: "POST",
      body: formData,
    });

    const response = await handleResizeImageRequest(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.detail).toBe("Image resize is not enabled.");
    expect(imageService.optimizeImageSize).not.toHaveBeenCalled();
  });
});
