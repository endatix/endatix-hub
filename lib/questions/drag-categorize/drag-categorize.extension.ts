import type { ExtensionModule } from "@/lib/survey-extensions/types";
import { bindDragCategorizeToCreator } from "./creator-bindings";
import { registerDragCategorizeComponent } from "./drag-categorize.component";
import { registerDragCategorizeGlobals } from "./registry";

/**
 * Survey extension entry point. All install logic lives here — do not wire
 * this feature from form-editor via initGlobals / bindToCreator hooks.
 *
 * Lifecycle:
 * - onInit: Serializer + QuestionFactory + ReactQuestionFactory registration
 * - onCreatorReady: toolbox category, icon, property-grid help texts
 * - onModelReady: not needed — validation lives on the question model itself
 */
const dragCategorizeExtension: ExtensionModule = {
  onInit: () => {
    registerDragCategorizeGlobals();
    registerDragCategorizeComponent();
  },
  onCreatorReady: (creator) => {
    bindDragCategorizeToCreator(creator);
  },
};

export { dragCategorizeExtension };
