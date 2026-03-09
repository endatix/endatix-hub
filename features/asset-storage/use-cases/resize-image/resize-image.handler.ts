import { TelemetryLogger } from "@/features/telemetry";
import { apiResponses } from "@/lib/utils/route-handlers";
import {
  optimizeImageSize,
  IMAGE_SERVICE_CONFIG,
} from "../../infrastructure/image-service";

const LOGGER_NAME = "resize-image";

/**
 * Handles POST request with a single image file in multipart form data.
 * Resizes the image (when resize is enabled) and returns the result as the response body.
 */
export async function handleResizeImageRequest(
  request: Request,
): Promise<Response> {
  if (!IMAGE_SERVICE_CONFIG.isResizeEnabled) {
    return apiResponses.badRequest({
      detail: "Image resize is not enabled.",
    });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (file == null || typeof file === "string") {
    return apiResponses.badRequest({
      detail:
        "Invalid or missing file. Send one image as multipart field 'file'.",
    });
  }

  const blobLike = file as Blob;
  const contentType = blobLike.type ?? "";
  if (!contentType.startsWith("image/")) {
    return apiResponses.badRequest({
      detail: "File must be an image.",
    });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await blobLike.arrayBuffer());
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    TelemetryLogger.critical(
      "Failed to read file buffer for resize",
      error,
      {},
      LOGGER_NAME,
    );
    return apiResponses.badRequest({
      detail:
        "Invalid or missing file. Send one image as multipart field 'file'.",
    });
  }

  try {
    const optimizedBuffer = await optimizeImageSize(buffer, contentType);
    return new Response(optimizedBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(optimizedBuffer.length),
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    TelemetryLogger.critical(
      "Image resize failed",
      error,
      { contentType },
      LOGGER_NAME,
    );
    return apiResponses.serverError({
      detail: "Image resize failed.",
    });
  }
}
