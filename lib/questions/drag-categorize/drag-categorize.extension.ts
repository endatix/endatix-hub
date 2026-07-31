import type { ExtensionModule } from "@/lib/survey-extensions/types";
// Not the feature barrel — keeps survey-creator-core out of this chunk.
import { registerCarryForwardForQuestionType } from "@/lib/survey-features/carry-forward/infrastructure/registry";
import { DRAG_CATEGORIZE_TYPE } from "./constants";
import { registerDragCategorizeQuestion } from "./drag-categorize.component";

/** Thin ExtensionModule adapter. See add-survey-feature skill §11. */
const dragCategorizeExtension: ExtensionModule = {
  onInit: () => {
    registerDragCategorizeQuestion();
    // After register: Serializer.addProperty needs the class. Flag-gated with other CF types.
    registerCarryForwardForQuestionType(DRAG_CATEGORIZE_TYPE);
  },
  onCreatorReady: async (creator) => {
    const { bindDragCategorizeToCreator } = await import(
      "./drag-categorize.creator"
    );
    bindDragCategorizeToCreator(creator);
  },
};

export { dragCategorizeExtension };
