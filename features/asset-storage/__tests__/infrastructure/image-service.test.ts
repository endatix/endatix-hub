import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { optimizeImageSize } from "../../infrastructure/image-service";
import { optimizeImage } from "next/dist/server/image-optimizer";

vi.mock("next/dist/server/image-optimizer");

describe("Image Service", () => {
  const mockBuffer = Buffer.from("test");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("IMAGE_SERVICE_CONFIG", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('should set isResizeEnabled to true when RESIZE_IMAGES is "true"', async () => {
      // Arrange
      process.env.RESIZE_IMAGES = "true";

      // Act
      const imageModule = await import("../../infrastructure/image-service");

      // Assert
      expect(imageModule.IMAGE_SERVICE_CONFIG.isResizeEnabled).toBe(true);
    });

    it('should set isResizeEnabled to false when RESIZE_IMAGES is "false"', async () => {
      // Arrange
      process.env.RESIZE_IMAGES = "false";

      // Act
      const imageModule = await import("../../infrastructure/image-service");

      // Assert
      expect(imageModule.IMAGE_SERVICE_CONFIG.isResizeEnabled).toBe(false);
    });

    it("should throw error when RESIZE_IMAGES is invalid", async () => {
      // Arrange
      process.env.RESIZE_IMAGES = "invalid";

      // Act & Assert
      await expect(async () => {
        await import("../../infrastructure/image-service");
      }).rejects.toThrow("RESIZE_IMAGES must be 'true' or 'false'");
    });

    it("should use default width when RESIZE_IMAGES_WIDTH is not set", async () => {
      // Arrange
      process.env.RESIZE_IMAGES = "true"; // Ensure valid value for RESIZE_IMAGES
      process.env.RESIZE_IMAGES_WIDTH = "";

      // Act
      const imageModule = await import("../../infrastructure/image-service");

      // Assert
      expect(imageModule.IMAGE_SERVICE_CONFIG.defaultResizeWidth).toBe(800); // 800 is the default value
    });

    it("should use specified width when RESIZE_IMAGES_WIDTH is set", async () => {
      // Arrange
      process.env.RESIZE_IMAGES = "true"; // Ensure valid value for RESIZE_IMAGES
      process.env.RESIZE_IMAGES_WIDTH = "1200";

      // Act
      const imageModule = await import("../../infrastructure/image-service");

      // Assert
      expect(imageModule.IMAGE_SERVICE_CONFIG.defaultResizeWidth).toBe(1200);
    });

    it("should throw error when RESIZE_IMAGES_WIDTH is invalid", async () => {
      // Arrange
      process.env.RESIZE_IMAGES = "true"; // Ensure valid value for RESIZE_IMAGES
      process.env.RESIZE_IMAGES_WIDTH = "invalid";

      // Act & Assert
      await expect(async () => {
        await import("../../infrastructure/image-service");
      }).rejects.toThrow("RESIZE_IMAGES_WIDTH must be a valid number");
    });
  });

  describe("optimizeImageSize", () => {
    beforeEach(() => {
      process.env.RESIZE_IMAGES = "true";
      process.env.RESIZE_IMAGES_WIDTH = "800";
    });

    it("should optimize image when RESIZE_IMAGES is true", async () => {
      // Arrange
      const mockOptimizedBuffer = Buffer.from("optimized");
      vi.mocked(optimizeImage).mockResolvedValue(mockOptimizedBuffer);

      // Act
      const result = await optimizeImageSize(mockBuffer, "image/jpeg");

      // Assert
      expect(optimizeImage).toHaveBeenCalledWith({
        buffer: mockBuffer,
        contentType: "image/jpeg",
        quality: 80,
        width: 800,
      });
      expect(result).toBe(mockOptimizedBuffer);
    });

    it("should return original buffer when RESIZE_IMAGES is false", async () => {
      // Arrange
      process.env.RESIZE_IMAGES = "false";

      // We need to re-import to get the updated config
      const imageModule = await import("../../infrastructure/image-service");

      // Act
      const result = await imageModule.optimizeImageSize(
        mockBuffer,
        "image/jpeg",
      );

      // Assert
      expect(optimizeImage).not.toHaveBeenCalled();
      expect(result).toBe(mockBuffer);
    });

    it("should throw error when contentType is missing", async () => {
      // Act & Assert
      await expect(optimizeImageSize(mockBuffer, "")).rejects.toThrow(
        "contentType is not provided",
      );
    });

    it("should throw error when imageBuffer is missing", async () => {
      // Act & Assert
      await expect(
        optimizeImageSize(undefined as unknown as Buffer, "image/jpeg"),
      ).rejects.toThrow("imageBuffer is not provided");
    });

    it("should not optimize non-image content types", async () => {
      // Act
      const result = await optimizeImageSize(mockBuffer, "application/pdf");

      // Assert
      expect(optimizeImage).not.toHaveBeenCalled();
      expect(result).toBe(mockBuffer);
    });

    it("should use default quality when not specified", async () => {
      // Arrange
      const mockOptimizedBuffer = Buffer.from("optimized");
      vi.mocked(optimizeImage).mockResolvedValue(mockOptimizedBuffer);

      // Act
      await optimizeImageSize(mockBuffer, "image/jpeg");

      // Assert
      expect(optimizeImage).toHaveBeenCalledWith(
        expect.objectContaining({
          quality: 80,
        }),
      );
    });

    it("should use specified quality when provided", async () => {
      // Arrange
      const mockOptimizedBuffer = Buffer.from("optimized");
      vi.mocked(optimizeImage).mockResolvedValue(mockOptimizedBuffer);
      const customQuality = 60;

      // Act
      await optimizeImageSize(mockBuffer, "image/jpeg", customQuality);

      // Assert
      expect(optimizeImage).toHaveBeenCalledWith(
        expect.objectContaining({
          quality: customQuality,
        }),
      );
    });

    it("should use specified width when provided", async () => {
      // Arrange
      const mockOptimizedBuffer = Buffer.from("optimized");
      vi.mocked(optimizeImage).mockResolvedValue(mockOptimizedBuffer);
      const customWidth = 1200;

      // Act
      await optimizeImageSize(mockBuffer, "image/jpeg", 80, customWidth);

      // Assert
      expect(optimizeImage).toHaveBeenCalledWith(
        expect.objectContaining({
          width: customWidth,
        }),
      );
    });

    it("should use default width when not specified", async () => {
      // Arrange
      const mockOptimizedBuffer = Buffer.from("optimized");
      vi.mocked(optimizeImage).mockResolvedValue(mockOptimizedBuffer);

      // Act
      await optimizeImageSize(mockBuffer, "image/jpeg");

      // Assert
      expect(optimizeImage).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 800,
        }),
      );
    });
  });
});
