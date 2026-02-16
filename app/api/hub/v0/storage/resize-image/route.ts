import { auth } from "@/auth";
import { authorization } from "@/features/auth";
import { handleResizeImageRequest } from "@/features/asset-storage/use-cases";

/**
 * POST: Accepts one image file (multipart field "file") and returns resized image when resize is enabled.
 * Requires authenticated user with hub access.
 */
export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  return handleResizeImageRequest(request);
}
