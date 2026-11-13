import { resolveFormRuntimeState } from "@/lib/form-runtime/resolve-form-runtime-state";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import type { DataListChoiceSource } from "../types";
import { resolveDataListDisplayValues } from "./resolve-data-list-display-values";
import { searchDataListChoices } from "./search-data-lists/search-data-list-choices";

/** The source the runtime deps carry, or the public form routes by default. */
export function dataListChoiceSource(
  deps: ExtensionRuntimeDeps,
): DataListChoiceSource {
  return (
    deps.dataListChoices ?? {
      searchChoices: (dataListId, params) =>
        searchDataListChoices(deps, dataListId, params),
      resolveDisplayValues: (dataListId, values, options) =>
        resolveDataListDisplayValues(deps, dataListId, values, options),
    }
  );
}

/**
 * {@link dataListChoiceSource}, or null when it cannot load yet: the public
 * routes need a form runtime, a source from the deps does not.
 */
export function loadableDataListChoiceSource(
  deps: ExtensionRuntimeDeps,
): DataListChoiceSource | null {
  if (
    !deps.dataListChoices &&
    !resolveFormRuntimeState(deps.getRuntimeState())
  ) {
    return null;
  }

  return dataListChoiceSource(deps);
}
