import type { ExtensionModule } from "@/lib/survey-extensions/types";
import { registerCompleteTriggerNavigationProperty } from "./registry";
import { bindChangeNavigationButtonsOnComplete } from "./survey-bindings";

registerCompleteTriggerNavigationProperty();

const completeTriggerNavigationExtension: ExtensionModule = {
  onCreatorReady: async (creator) => {
    // Not a static import. Keeps survey-creator-core out of the respondent chunk.
    const {
      registerCompleteTriggerNavigationPropertyHelp,
      bindChangeNavigationButtonsOnCompleteToCreator,
    } = await import("./creator-bindings");
    registerCompleteTriggerNavigationPropertyHelp();
    bindChangeNavigationButtonsOnCompleteToCreator(creator);
  },
  onModelReady: (model) => {
    bindChangeNavigationButtonsOnComplete(model);
  },
};

export { completeTriggerNavigationExtension };
