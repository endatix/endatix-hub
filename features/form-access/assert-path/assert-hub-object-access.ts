import type { ClientStorageConfig } from "@/features/asset-storage/infrastructure/providers/shared/client-storage-config";
import type { ParsedStorageObjectUrl } from "@/features/asset-storage/utils";
import type { HubStorageScope } from "../types";
import { assertUserFileBlobPath } from "./assert-user-file-blob-path";
import {
  isContentObjectPath,
  isFormContentObjectPath,
  isTemplateContentObjectPath,
} from "./content-object-path";

/** Hub read-urls: content allows scoped or elevated `f/*`/`t/*` keys; user-files require form + submission. */
export function assertHubObjectAccess(
  parsed: ParsedStorageObjectUrl,
  scope: HubStorageScope,
  storageConfig: ClientStorageConfig,
): string | null {
  const userFilesContainer =
    storageConfig.containerNames.USER_FILES.toLowerCase();
  const contentContainer = storageConfig.containerNames.CONTENT.toLowerCase();
  const container = parsed.containerName.toLowerCase();
  const blobName = parsed.blobName;

  if (container === contentContainer) {
    if (!isContentObjectPath(blobName)) {
      return "Content object is not in hub content namespace";
    }

    if (scope.formId && isFormContentObjectPath(blobName, scope.formId)) {
      return null;
    }

    if (
      scope.templateId &&
      isTemplateContentObjectPath(blobName, scope.templateId)
    ) {
      return null;
    }

    // Hub editors may presign any content asset until per-image DB permissions exist.
    return null;
  }

  if (container !== userFilesContainer) {
    return "Unknown storage container";
  }

  if (!scope.formId) {
    return "Form context is required for user file access";
  }

  return assertUserFileBlobPath(
    blobName,
    { formId: scope.formId, submissionId: scope.submissionId },
    { requireSubmission: true },
  );
}
