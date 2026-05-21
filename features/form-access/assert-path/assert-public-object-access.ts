import type { ClientStorageConfig } from "@/features/asset-storage/infrastructure/providers/shared/client-storage-config";
import type { ParsedStorageObjectUrl } from "@/features/asset-storage/utils";
import type { FormStorageAccess } from "../types";
import { assertUserFileBlobPath } from "./assert-user-file-blob-path";
import { isContentObjectPath } from "./content-object-path";

/** Returns an error message when the object key is not allowed for public-plane access, or null if allowed. */
export function assertPublicObjectAccess(
  parsed: ParsedStorageObjectUrl,
  access: FormStorageAccess,
  storageConfig: ClientStorageConfig,
): string | null {
  const userFilesContainer =
    storageConfig.containerNames.USER_FILES.toLowerCase();
  const contentContainer = storageConfig.containerNames.CONTENT.toLowerCase();
  const container = parsed.containerName.toLowerCase();
  const blobName = parsed.blobName;

  if (container === contentContainer) {
    if (!isContentObjectPath(blobName)) {
      return "Content object is not in form content namespace";
    }
    return null;
  }

  if (container !== userFilesContainer) {
    return "Unknown storage container";
  }

  return assertUserFileBlobPath(
    blobName,
    { formId: access.formId, submissionId: access.submissionId },
    { requireSubmission: true },
  );
}
