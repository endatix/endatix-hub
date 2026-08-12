import { SvgRegistry } from "survey-core";
import type { ExtensionModule } from "@/lib/survey-extensions/types";
// Not the feature barrel — keeps survey-creator-core out of this chunk.
import { registerCarryForwardForQuestionType } from "@/lib/survey-features/carry-forward/infrastructure/registry";
import { DRAG_CATEGORIZE_TYPE } from "./constants";
import { registerDragCategorizeQuestion } from "./drag-categorize.component";
import { DRAG_CATEGORIZE_SVG } from "./drag-categorize.icon";

/** Thin ExtensionModule adapter. See add-survey-feature skill §11. */
const dragCategorizeExtension: ExtensionModule = {
  onInit: () => {
    registerDragCategorizeQuestion();
    // After register: Serializer.addProperty needs the class. Flag-gated with other CF types.
    registerCarryForwardForQuestionType(DRAG_CATEGORIZE_TYPE);
    // Registered here (not in the lazy-loaded creator.ts) so the toolbox
    // icon is in SvgRegistry before the Creator ever mounts — the icon is
    // a dependency-free string, it doesn't need to wait behind
    // survey-creator-core. registerIcons (plural) also fires
    // onIconsChanged, so an already-mounted SvgBundleComponent repaints if
    // this somehow still runs late — registerIcon (singular) does not.
    SvgRegistry.registerIcons({ [DRAG_CATEGORIZE_TYPE]: DRAG_CATEGORIZE_SVG });
  },
  onCreatorReady: async (creator) => {
    const { bindDragCategorizeToCreator } = await import(
      "./drag-categorize.creator"
    );
    bindDragCategorizeToCreator(creator);
  },
};

export { dragCategorizeExtension };
