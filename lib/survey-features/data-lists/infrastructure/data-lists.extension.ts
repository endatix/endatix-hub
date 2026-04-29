import type { ExtensionModule } from "@/lib/survey-extensions/types";
import { bindDataListsToCreator } from "@/lib/survey-features/data-lists/infrastructure/creator-bindings";
import { registerDataListGlobals } from "@/lib/survey-features/data-lists/infrastructure/registry";
import { bindDataListsToSurvey } from "@/lib/survey-features/data-lists/infrastructure/survey-bindings";

const dataListsExtension: ExtensionModule = {
  onInit: () => {
    registerDataListGlobals();
  },
  onCreatorReady: (creator, deps) => {
    bindDataListsToCreator(creator, deps.getRuntimeState);
  },
  onModelReady: (model, deps) => {
    bindDataListsToSurvey(model, deps.getRuntimeState);
  },
};

export { dataListsExtension };
