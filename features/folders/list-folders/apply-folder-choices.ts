import { showStandingRefusal } from "@/components/error-handling/show-action-failure";
import { Result } from "@/lib/result";
import type { Folder } from "@/lib/endatix-api/folders/types";

/** Optional folder reads preserve the existing choices on ordinary failures. */
export function applyFolderChoices(
  result: Result<Folder[]>,
  apply: (folders: Folder[]) => void,
) {
  if (Result.isSuccess(result)) apply(result.value);
  else if (result.requiredAction) showStandingRefusal(result.requiredAction);
}
