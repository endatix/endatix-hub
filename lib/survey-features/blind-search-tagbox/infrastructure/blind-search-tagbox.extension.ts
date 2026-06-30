import type { ExtensionModule } from "@/lib/survey-extensions/types";
import {
  registerChoicesLazyLoadCompletedHandler,
  registerChoicesLazyLoadGuard,
} from "@/lib/survey-features/infrastructure/choices-lazy-load-guards";
import { bindBlindSearchToCreator } from "./creator-bindings";
import { registerBlindSearchTagboxGlobals } from "./registry";
import {
  applyBlindSearchOtherFallbackAfterLazyLoad,
  bindBlindSearchToSurvey,
} from "./survey-bindings";
import { BLIND_SEARCH_TAGBOX_EXTENSION_ID } from "../constants";
import { shouldSuppressChoices } from "../use-cases/blind-search-state";

/**
 * Survey extension entry point. All install logic lives here — do not wire this
 * feature from form-editor via initGlobals / bindToCreator hooks.
 *
 * Lifecycle:
 * - onInit: Serializer metadata + cross-feature guard registries (runs when extension is selected)
 * - onCreatorReady: designer preview and Creator survey instances
 * - onModelReady: respondent / standalone Model surfaces
 */
const blindSearchTagboxExtension: ExtensionModule = {
  onInit: () => {
    registerBlindSearchTagboxGlobals();
    registerChoicesLazyLoadGuard(
      BLIND_SEARCH_TAGBOX_EXTENSION_ID,
      shouldSuppressChoices,
    );
    registerChoicesLazyLoadCompletedHandler(
      BLIND_SEARCH_TAGBOX_EXTENSION_ID,
      applyBlindSearchOtherFallbackAfterLazyLoad,
    );
  },
  onCreatorReady: (creator) => {
    bindBlindSearchToCreator(creator);
  },
  onModelReady: (model) => {
    bindBlindSearchToSurvey(model);
  },
};

export { blindSearchTagboxExtension };
