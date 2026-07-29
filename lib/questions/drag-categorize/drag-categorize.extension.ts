import type { ExtensionModule } from "@/lib/survey-extensions/types";
// Imported from the module, not the feature barrel, to keep the Creator out of
// this chunk — see the note on onCreatorReady below.
import { registerCarryForwardForQuestionType } from "@/lib/survey-features/carry-forward/infrastructure/registry";
import { DRAG_CATEGORIZE_TYPE } from "./constants";
import { registerDragCategorizeQuestion } from "./drag-categorize.component";

/**
 * Extension adapter for the drag-categorize question.
 *
 * The extension framework's only job here is registration — it decides
 * *when* the question loads (code-split, and only for forms that use the
 * type). All behavior lives in the question module itself, so surfaces the
 * framework cannot reach (server-side PDF export, the read-only submission
 * survey) register the question directly instead.
 *
 * The Creator bindings are imported dynamically rather than at the top of this
 * file. A respondent opening a public form that uses this question type loads
 * this module — a static import would put survey-creator-core in that chunk,
 * for code only the designer ever runs.
 */
const dragCategorizeExtension: ExtensionModule = {
  onInit: () => {
    registerDragCategorizeQuestion();
    // Opt into advanced Carry forward from here rather than from the model
    // registry, so it is gated by ENDATIX_ENABLE_EXTENSIONS exactly like the
    // built-in types, whose properties are added by carryForwardExtension.onInit.
    //
    // Registering it in the registry instead reached every surface — the
    // respondent runner, the read-only submission survey and the server-side
    // PDF pipeline — and with extensions off that left a form JSON carrying
    // `edxCarryForwardEnabled: true` looking like an active target that nothing
    // ever syncs: an empty item pool and no diagnostic.
    //
    // Must stay after registerDragCategorizeQuestion: SurveyJS discards
    // properties added to a class it does not know yet. Safe with respect to
    // parse time because the runner waits for extensions to finish loading
    // before constructing the SurveyModel (see survey-js-wrapper's isReady).
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
