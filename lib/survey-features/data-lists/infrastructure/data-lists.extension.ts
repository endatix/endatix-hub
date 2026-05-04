import type { ExtensionModule } from "@/lib/survey-extensions/types";
import { bindDataListsToCreator } from "@/lib/survey-features/data-lists/infrastructure/creator-bindings";
import { registerDataListGlobals } from "@/lib/survey-features/data-lists/infrastructure/registry";
import { bindDataListsToSurvey } from "@/lib/survey-features/data-lists/infrastructure/survey-bindings";

/**
 * Runtime-bound extension. Requires a form access JWT context; consumers without
 * one (e.g. the form template editor) must opt out via `extensionIdsToLoad`.
 */
const dataListsExtension: ExtensionModule = {
  onInit: () => {
    registerDataListGlobals();
  },
  onCreatorReady: (creator, deps) => {
    bindDataListsToCreator(creator, deps);
  },
  onModelReady: (model, deps) => {
    bindDataListsToSurvey(model, deps);
  },
};

export { dataListsExtension };
