import type { ExtensionModule } from "@/lib/survey-extensions/types";
import { bindDataListsToCreator } from "@/lib/survey-features/data-lists/infrastructure/creator-bindings";
import { registerDataListCreatorHelp } from "@/lib/survey-features/data-lists/infrastructure/creator-help";
import { registerDataListCatalogLazyChoiceProvider } from "@/lib/survey-features/data-lists/infrastructure/data-list-catalog-lazy-choice-provider";
import { registerDataListGlobals } from "@/lib/survey-features/data-lists/infrastructure/registry";
import { bindDataListsToSurvey } from "@/lib/survey-features/data-lists/infrastructure/survey-bindings";

/**
 * Runtime-bound extension. Requires a stable form runtime with `formId` (e.g.
 * `FormRuntimeProvider` `stateRef.current`) so JWT cache keys match across lazy-load calls.
 * Ephemeral `getRuntimeState()` snapshots are unsupported. Consumers without form access
 * (e.g. the form template editor) must opt out via `extensionIdsToLoad`.
 */
const dataListsExtension: ExtensionModule = {
  onInit: () => {
    registerDataListGlobals();
    registerDataListCatalogLazyChoiceProvider();
    registerDataListCreatorHelp();
  },
  onCreatorReady: (creator, deps) => {
    bindDataListsToCreator(creator, deps);
  },
  onModelReady: (model, deps) => {
    bindDataListsToSurvey(model, deps);
  },
};

export { dataListsExtension };
