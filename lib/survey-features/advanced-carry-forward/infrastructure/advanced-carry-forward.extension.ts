import type { ExtensionModule } from '@/lib/survey-extensions/types';
import { bindAdvancedCarryForwardToCreator } from './creator-bindings';
import { registerAdvancedCarryForwardCreatorHelp } from './creator-help';
import { registerAdvancedCarryForwardGlobals } from './registry';
import { bindAdvancedCarryForwardToSurvey } from './survey-bindings';

/**
 * Survey extension entry point. All install logic lives here — do not wire this
 * feature from form-editor via initGlobals / bindToCreator hooks.
 */
const advancedCarryForwardExtension: ExtensionModule = {
  onInit: () => {
    registerAdvancedCarryForwardGlobals();
    registerAdvancedCarryForwardCreatorHelp();
  },
  onCreatorReady: (creator) => {
    bindAdvancedCarryForwardToCreator(creator);
  },
  onModelReady: (model) => {
    bindAdvancedCarryForwardToSurvey(model);
  },
};

export { advancedCarryForwardExtension };
