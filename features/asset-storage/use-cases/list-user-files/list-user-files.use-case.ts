import { Result } from "@/lib/result";
import { blobMetadataParser } from "@endatix/storage-azure";
import { getStorageRuntimeSettings } from "../../storage-runtime";
import { listBlobs } from "../../infrastructure/storage-gateway";
import type { UserFileMetadata } from "../../types";

/**
 * Returns list data (displayName, originalFileName, questionName, contentType) for all submission files.
 * Uses Azure Blob–specific metadata parsing via blob-metadata-parser.
 */
export async function listUserFiles(
  formId: string,
  submissionId: string,
): Promise<Result<UserFileMetadata[]>> {
  const storageSettings = getStorageRuntimeSettings();
  const config = storageSettings.azure;
  if (!storageSettings.isEnabled || config === null) {
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
