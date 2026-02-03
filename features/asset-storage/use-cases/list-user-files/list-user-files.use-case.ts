import { Result } from "@/lib/result";
import { blobMetadataParser } from "../../infrastructure/blob-metadata-parser";
import { getStorageConfig } from "../../infrastructure/storage-config";
import { listBlobs } from "../../infrastructure/storage-service";
import type { UserFileMetadata } from "../../types";

/**
 * Returns list data (displayName, originalFileName, questionName, contentType) for all submission files.
 * Uses Azure Blob–specific metadata parsing via blob-metadata-parser.
 */
export async function listUserFiles(
  formId: string,
  submissionId: string,
): Promise<Result<UserFileMetadata[]>> {
  const config = getStorageConfig();
  if (!config.isEnabled) {
    return Result.error("Storage is not enabled");
  }

  const containerName = config.containerNames.USER_FILES;

  try {
    const blobs = await listBlobs({
      containerName,
      formId,
      submissionId,
    });
    return Result.success(
      blobs.map((blob) => blobMetadataParser.parseFromBlob(blob)),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list files";
    return Result.error(message);
  }
}
