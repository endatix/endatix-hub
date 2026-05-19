import type { ClientStorageConfig } from "@/features/asset-storage/infrastructure/providers/shared/client-storage-config";
import type { ParsedStorageObjectUrl } from "@/features/asset-storage/infrastructure/providers/shared/storage-url-parse";
import type { FormStorageAccess } from "../types";
import { assertUserFileBlobPath } from "./assert-user-file-blob-path";

function isContentNamespace(blobName: string): boolean {
  return blobName.startsWith("f/") || blobName.startsWith("t/");
}

/** Returns an error message when the object key is not allowed for respondent access, or null if allowed. */
export function assertStorageObjectAccess(
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
    if (!isContentNamespace(blobName)) {
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
