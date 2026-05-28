import type { ClientStorageConfig } from "@/features/asset-storage/infrastructure/providers/shared/client-storage-config";
import type { ParsedStorageObjectUrl } from "@/features/asset-storage/utils";
import { assertUserFileBlobPath } from "./assert-user-file-blob-path";
import { isContentObjectPath } from "./content-object-path";

type ContentNamespaceName = "designer" | "form" | "hub";

interface StorageObjectPathAccessOptions {
  formId?: string;
  submissionId?: string;
  contentNamespaceName: ContentNamespaceName;
}

/**
 * Asserts that a storage object path is scoped to a form and submission.
 * @param parsed - The parsed storage object url
 * @param storageConfig - The storage config
 * @param options - The options
 * @returns The error message or null if the path is valid
 */
function assertStorageObjectPathAccess(
  parsed: ParsedStorageObjectUrl,
  storageConfig: ClientStorageConfig,
  options: StorageObjectPathAccessOptions,
): string | null {
  const userFilesContainer =
    storageConfig.containerNames.USER_FILES.toLowerCase();
  const contentContainer = storageConfig.containerNames.CONTENT.toLowerCase();
  const container = parsed.containerName.toLowerCase();
  const blobName = parsed.blobName;

  if (container === contentContainer) {
    return isContentObjectPath(blobName)
      ? null
      : `Content object is not in ${options.contentNamespaceName} content namespace`;
  }

  if (container !== userFilesContainer) {
    return "Unknown storage container";
  }

  if (!options.formId) {
    return "Form context is required for user file access";
  }

  return assertUserFileBlobPath(
    blobName,
    { formId: options.formId, submissionId: options.submissionId },
    { requireSubmission: true },
  );
}

export { assertStorageObjectPathAccess };
