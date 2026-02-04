import { handleResizeImageRequest } from "@/features/asset-storage/use-cases";

/**
 * POST: Accepts one image file (multipart field "file") and returns resized image when resize is enabled.
 */
export async function POST(request: Request): Promise<Response> {
  return await handleResizeImageRequest(request);
}
