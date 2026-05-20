import { auth } from "@/auth";
import { authorization } from "@/features/auth";
import {
  getContainerNames,
  type ContentItemType,
} from "@/features/asset-storage/server";
import { requireActiveStorageProvider } from "@/features/asset-storage/storage-runtime";
import { generateUniqueFileName } from "@/features/asset-storage";
import { buildContentFolderPath } from "@/features/asset-storage/infrastructure/storage-utils";
import { Result } from "@/lib/result";
import { apiResponses } from "@/lib/utils/route-handlers";
import type { UploadUrlDescriptor } from "@/features/asset-storage/infrastructure/core";
import type {
  FileMetadata,
  ProcessedState,
} from "@/features/asset-storage/types";

interface ContentUploadUrlsRequest {
  itemId: string;
  itemType: ContentItemType;
  fileNames: string[];
  questionName?: string;
  fileTypes?: Record<string, string>;
  fileStates?: Record<string, ProcessedState>;
}

export type UploadUrlEntry = UploadUrlDescriptor | { error: string };

/** Server-provided metadata for the client to set on each blob upload. */
interface ContentUploadMetadata {
  userId: string;
  itemId: string;
  contentItemType: string;
  questionName: string;
}

interface ContentUploadUrlsResponse {
  uploads: Record<string, UploadUrlEntry>;
  uploadMetadata: ContentUploadMetadata;
}

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  let data: ContentUploadUrlsRequest;
  try {
    data = await request.json();
  } catch {
    return apiResponses.badRequest({ detail: "Invalid JSON body" });
  }

  const { itemId, itemType, fileNames, questionName, fileTypes, fileStates } =
    data;

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
  const uploads: Record<string, UploadUrlEntry> = {};

  for (const fileName of fileNames) {
    const uniqueFileNameResult = generateUniqueFileName(fileName);
    if (Result.isError(uniqueFileNameResult)) {
      uploads[fileName] = { error: uniqueFileNameResult.message };
      continue;
    }

    try {
      const contentType = fileTypes?.[fileName] ?? "application/octet-stream";
      const fileState = fileStates?.[fileName];
      const blobUploadFileMetadata: FileMetadata = {
        kind: "content",
        uploadedBy: session!.user?.id ?? "",
        itemId: itemId.trim(),
        contentItemType: itemType,
        displayName: fileName,
        contentType,
        questionName: questionName ?? "",
      };
      if (fileState !== undefined) {
        blobUploadFileMetadata.fileState = fileState;
      }

      const descriptor = await requireActiveStorageProvider().generateUploadUrl(
        {
          containerName,
          folderPath,
          fileName: uniqueFileNameResult.value,
          blobUploadFileMetadata,
        },
      );
      uploads[fileName] = descriptor;
    } catch (error) {
      uploads[fileName] = {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  const uploadMetadata: ContentUploadMetadata = {
    userId: session!.user?.id ?? "",
    itemId: itemId.trim(),
    contentItemType: itemType,
    questionName: questionName ?? "",
  };

  const body: ContentUploadUrlsResponse = { uploads, uploadMetadata };
  return Response.json(body);
}
