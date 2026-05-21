import type { ClientStorageConfig } from "@/features/asset-storage/infrastructure/providers/shared/client-storage-config";
import type { ParsedStorageObjectUrl } from "@/features/asset-storage/utils";
import type { HubStorageScope } from "../types";
import { assertStorageObjectPathAccess } from "./assert-storage-object-path";

/** Hub read-urls: content allows scoped or elevated `f/*`/`t/*` keys; user-files require form + submission. */
export function assertHubObjectAccess(
  parsed: ParsedStorageObjectUrl,
  scope: HubStorageScope,
  storageConfig: ClientStorageConfig,
): string | null {
  return assertStorageObjectPathAccess(parsed, storageConfig, {
    formId: scope.formId,
    submissionId: scope.submissionId,
    contentNamespaceName: "hub",
  });
}
