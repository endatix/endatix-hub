import type { ExtensionModule } from "@/lib/survey-extensions/types";
import { registerDragCategorizeQuestion } from "./drag-categorize.component";
import { bindDragCategorizeToCreator } from "./drag-categorize.creator";

/**
 * Extension adapter for the drag-categorize question.
 *
 * The extension framework's only job here is registration — it decides
 * *when* the question loads (code-split, and only for forms that use the
 * type). All behavior lives in the question module itself, so surfaces the
 * framework cannot reach (server-side PDF export, the read-only submission
 * survey) register the question directly instead.
 */
const dragCategorizeExtension: ExtensionModule = {
  onInit: () => {
    registerDragCategorizeQuestion();
  },
  onCreatorReady: (creator) => {
    bindDragCategorizeToCreator(creator);
  },
};

export { dragCategorizeExtension };
