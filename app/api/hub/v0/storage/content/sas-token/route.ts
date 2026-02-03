import { auth } from "@/auth";
import { authorization } from "@/features/auth";
import {
  getContainerNames,
  generateUploadUrl,
  type ContentItemType,
} from "@/features/asset-storage/server";
import { generateUniqueFileName } from "@/features/asset-storage";
import { buildContentFolderPath } from "@/features/asset-storage/infrastructure/storage-utils";
import { Result } from "@/lib/result";
import { apiResponses } from "@/lib/utils/route-handlers";

interface ContentSASTokenRequest {
  itemId: string;
  itemType: ContentItemType;
  fileNames: string[];
  questionId?: string;
}

interface SASOperationResult {
  success: boolean;
  message?: string;
  url?: string;
}

/** Server-provided metadata for the client to set on each blob upload. */
interface ContentUploadMetadata {
  userId: string;
  itemId: string;
  contentItemType: string;
  questionId: string;
}

interface ContentSASTokenResponse {
  sasTokens: Record<string, SASOperationResult>;
  uploadMetadata: ContentUploadMetadata;
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  let data: ContentSASTokenRequest;
  try {
    data = await request.json();
  } catch {
    return apiResponses.badRequest({ detail: "Invalid JSON body" });
  }

  const { itemId, itemType, fileNames, questionId } = data;

  if (!itemId?.trim()) {
    return apiResponses.badRequest({ detail: "Item ID is required" });
  }
  if (!itemType) {
    return apiResponses.badRequest({ detail: "Item type is required" });
  }
  if (!Array.isArray(fileNames) || fileNames.length === 0) {
    return apiResponses.badRequest({ detail: "File names are required" });
  }

  const folderPathResult = buildContentFolderPath(itemType, itemId);
  if (Result.isError(folderPathResult)) {
    return apiResponses.badRequest({
      detail: folderPathResult.message ?? "Invalid item",
    });
  }

  const containerNames = getContainerNames();
  const containerName = containerNames.CONTENT;
  const folderPath = folderPathResult.value;
  const sasTokens: Record<string, SASOperationResult> = {};

  for (const fileName of fileNames) {
    const uniqueFileNameResult = generateUniqueFileName(fileName);
    if (Result.isError(uniqueFileNameResult)) {
      sasTokens[fileName] = {
        success: false,
        message: uniqueFileNameResult.message,
      };
      continue;
    }

    try {
      const sasUrl = await generateUploadUrl({
        containerName,
        folderPath,
        fileName: uniqueFileNameResult.value,
      });
      sasTokens[fileName] = { success: true, url: sasUrl };
    } catch (error) {
      sasTokens[fileName] = {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  const uploadMetadata: ContentUploadMetadata = {
    userId: session!.user?.id ?? "",
    itemId: itemId.trim(),
    contentItemType: itemType,
    questionId: questionId ?? "",
  };

  const body: ContentSASTokenResponse = { sasTokens, uploadMetadata };
  return Response.json(body);
}
