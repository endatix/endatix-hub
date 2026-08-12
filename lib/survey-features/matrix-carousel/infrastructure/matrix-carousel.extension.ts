import type { ExtensionModule } from "@/lib/survey-extensions/types";
import { registerMatrixCarouselCreatorHelp, bindMatrixCarouselToCreator } from "./creator-bindings";
import { registerMatrixCarouselRenderer } from "./matrix-carousel-renderer";
import { registerMatrixCarouselSchema } from "./registry";
import {
  bindMatrixCarouselRowSourceToSurvey,
  bindMatrixCarouselToSurvey,
} from "./survey-bindings";

/**
 * Survey extension entry point. All install logic lives here — do not wire
 * this feature from form-editor via initGlobals / bindToCreator hooks.
 *
 * onInit registers the renderer eagerly (not deferred to onCreatorReady, the
 * way pure Creator-only bindings are) because it swaps a shared
 * ReactQuestionFactory registration ("matrix") that respondents need too,
 * not just the designer.
 */
const matrixCarouselExtension: ExtensionModule = {
  onInit: () => {
    registerMatrixCarouselSchema();
    registerMatrixCarouselRenderer();
  },
  onCreatorReady: (creator) => {
    registerMatrixCarouselCreatorHelp();
    bindMatrixCarouselToCreator(creator);
  },
  onModelReady: (model) => {
    bindMatrixCarouselToSurvey(model);
    bindMatrixCarouselRowSourceToSurvey(model);
  },
};

export { matrixCarouselExtension };
