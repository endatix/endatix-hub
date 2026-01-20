import { getSession } from "@/features/auth";
import { headers } from "next/headers";
import { Result } from "@/lib/result";
import { apiResponses } from "@/lib/utils/route-handlers";
import { ContentItemType, UploadContentFileCommand } from "@/features/asset-storage";
import { uploadContentFileUseCase } from "@/features/asset-storage/server";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return apiResponses.unauthorized({
      detail: "You must be authenticated to upload a content file",
    });
  }

  const requestHeaders = await headers();
  const itemId = requestHeaders.get("edx-item-id") as string;
  const itemType = requestHeaders.get("edx-item-type") as ContentItemType;

  if (!itemId) {
    return apiResponses.badRequest({
      detail: "Item ID is required",
    });
  }

  if (!itemType) {
    return apiResponses.badRequest({
      detail: "Item type is required",
    });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return apiResponses.badRequest({
      detail: "Invalid or missing file",
    });
  }

  const command: UploadContentFileCommand = {
    itemId: itemId,
    itemType: itemType,
    file: file as File,
  };
  const uploadResult = await uploadContentFileUseCase(command);

  if (Result.isError(uploadResult)) {
    return apiResponses.serverError({
      detail: uploadResult.message,
    });
  }

  return Response.json(uploadResult.value);
}
