import { apiResponses } from "@/lib/utils/route-handlers";
import { optimizeImageSize } from "../../infrastructure/image-service";

/**
 * Handles POST request with a single image file in multipart form data.
 * Resizes the image (when resize is enabled) and returns the result as the response body.
 */
export async function handleResizeImageRequest(
  request: Request,
): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return apiResponses.badRequest({
      detail:
        "Invalid or missing file. Send one image as multipart field 'file'.",
    });
  }

  const typedFile = file as File;
  if (!typedFile.type.startsWith("image/")) {
    return apiResponses.badRequest({
      detail: "File must be an image.",
    });
  }

  const buffer = Buffer.from(await typedFile.arrayBuffer());
  const optimizedBuffer = await optimizeImageSize(buffer, typedFile.type);

  return new Response(optimizedBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": typedFile.type,
      "Content-Length": String(optimizedBuffer.length),
    },
  });
}
