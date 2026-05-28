import { Result } from "@/lib/result";
import { blobMetadataParser } from "../../infrastructure/providers/shared/blob-metadata-parser";
import {
  getActiveStorageProvider,
  getClientStorageConfig,
} from "../../storage-runtime";
import type { UserFileMetadata } from "../../types";

/**
 * Returns list data (displayName, originalFileName, questionName, contentType) for all submission files.
 * Uses blob metadata parsing (Azure and S3 HeadObject share the same metadata keys).
 */
export async function listUserFiles(
  formId: string,
  submissionId: string,
): Promise<Result<UserFileMetadata[]>> {
  const clientConfig = getClientStorageConfig();

  if (!clientConfig.isEnabled) {
    return Result.error("Storage is not enabled");
  }

  const containerName = clientConfig.containerNames.USER_FILES;
  const provider = getActiveStorageProvider();
  if (provider === null || !provider.isEnabled()) {
    return Result.error("Storage is not enabled");
  }

  try {
    const blobs = await provider.listBlobs({
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
