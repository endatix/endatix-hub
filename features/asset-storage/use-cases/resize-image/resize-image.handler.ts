import { apiResponses } from "@/lib/utils/route-handlers";
import {
  optimizeImageSize,
  IMAGE_SERVICE_CONFIG,
} from "../../infrastructure/image-service";

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
  } catch {
    return apiResponses.badRequest({
      detail:
        "Invalid or missing file. Send one image as multipart field 'file'.",
    });
  }

  const optimizedBuffer = await optimizeImageSize(buffer, contentType);

  return new Response(optimizedBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(optimizedBuffer.length),
    },
  });
}
