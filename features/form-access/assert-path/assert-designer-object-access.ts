import type { ClientStorageConfig } from "@/features/asset-storage/infrastructure/providers/shared/client-storage-config";
import type { ParsedStorageObjectUrl } from "@/features/asset-storage/utils";
import { DesignerScope } from "@/lib/designer-runtime";
import { assertStorageObjectPathAccess } from "./assert-storage-object-path";

/** Hub designer read-urls: content allows scoped or elevated `f/*`/`t/*` keys; user-files require form + submission. */
export function assertDesignerObjectAccess(
  parsed: ParsedStorageObjectUrl,
  scope: DesignerScope,
  storageConfig: ClientStorageConfig,
): string | null {
  return assertStorageObjectPathAccess(parsed, storageConfig, {
    formId: scope.formId,
    submissionId: scope.submissionId,
    contentNamespaceName: "designer",
  });
}
