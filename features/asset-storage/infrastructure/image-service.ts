import { parseBoolean } from "@/lib/utils/type-parsers";
import { optimizeImage } from "next/dist/server/image-optimizer";

const DEFAULT_IMAGE_WIDTH = 800;

type ImageServiceConfig = {
  isResizeEnabled: boolean;
  defaultResizeWidth: number;
};

const IMAGE_SERVICE_CONFIG: ImageServiceConfig = Object.freeze({
  isResizeEnabled: (() => {
    const raw = process.env.RESIZE_IMAGES ?? "true";
    if (!["true", "false"].includes(raw.toLowerCase())) {
      throw new Error("RESIZE_IMAGES must be 'true' or 'false'");
    }
    return parseBoolean(raw);
  })(),
  defaultResizeWidth: (() => {
    const width = process.env.RESIZE_IMAGES_WIDTH;
    if (!width) return DEFAULT_IMAGE_WIDTH;
    const parsedWidth = Number.parseInt(width, 10);
    if (Number.isNaN(parsedWidth)) {
      throw new Error("RESIZE_IMAGES_WIDTH must be a valid number");
    }
    return parsedWidth;
  })(),
});

/**
 * Optimizes an image by resizing and compressing it
 * @param imageBuffer - The buffer containing the image data
 * @param contentType - The MIME type of the image (e.g., 'image/jpeg', 'image/png')
 * @param quality - The quality of the output image (1-100), defaults to 80
 * @param width - The target width to resize the image to, defaults to value from environment or DEFAULT_IMAGE_WIDTH. Note if the image has a smaller width than the target width, it will not be resized.
 * @returns A Promise resolving to the optimized image buffer
 */
async function optimizeImageSize(
  imageBuffer: Buffer,
  contentType: string,
  quality: number = 80,
  width?: number,
): Promise<Buffer> {
  if (!contentType) {
    throw new Error("contentType is not provided");
  }

  if (!imageBuffer) {
    throw new Error("imageBuffer is not provided");
  }

  const shouldResize =
    IMAGE_SERVICE_CONFIG.isResizeEnabled && contentType.startsWith("image/");
  if (!shouldResize) {
    return imageBuffer;
  }

  const STEP_IMAGE_RESIZE_START = performance.now();

  const optimizedImageBuffer = await optimizeImage({
    buffer: imageBuffer,
    contentType: contentType,
    quality: quality,
    width: width ?? IMAGE_SERVICE_CONFIG.defaultResizeWidth,
  });

  const STEP_IMAGE_RESIZE_END = performance.now();
  console.log(
    `⏱️ Image resize took ${STEP_IMAGE_RESIZE_END - STEP_IMAGE_RESIZE_START}ms`,
  );

  return optimizedImageBuffer;
}

export { optimizeImageSize, IMAGE_SERVICE_CONFIG };
