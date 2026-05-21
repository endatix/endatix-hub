import type { ClientStorageConfig } from "@/features/asset-storage/infrastructure/providers/shared/client-storage-config";
import type { ParsedStorageObjectUrl } from "@/features/asset-storage/utils";
import type { FormStorageAccess } from "../types";
import { assertStorageObjectPathAccess } from "./assert-storage-object-path";

/** Returns an error message when the object key is not allowed for public-plane access, or null if allowed. */
export function assertPublicObjectAccess(
  parsed: ParsedStorageObjectUrl,
  access: FormStorageAccess,
  storageConfig: ClientStorageConfig,
): string | null {
  return assertStorageObjectPathAccess(parsed, storageConfig, {
    formId: access.formId,
    submissionId: access.submissionId,
    contentNamespaceName: "form",
  });
}
