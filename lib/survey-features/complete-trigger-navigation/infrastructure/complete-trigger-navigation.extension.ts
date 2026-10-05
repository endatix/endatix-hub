import type { ExtensionModule } from "@/lib/survey-extensions/types";
import {
  registerCompleteTriggerNavigationProperty,
  revealCompleteTriggerNavigationProperty,
} from "./registry";
import { installCompleteTriggerNavigationPatch } from "./survey-navigation-patch";

/**
 * Survey extension entry point. All install logic lives here — do not wire
 * this feature from form-editor via initGlobals / bindToCreator hooks.
 *
 * The Serializer property is registered at module scope, not in onInit.
 * ENDATIX_ENABLE_EXTENSIONS defaults off, so onInit does not run, and an
 * unregistered property is stripped by Model.toJSON(). The JSON editor save
 * path (use-json-editor.hook.ts: new Model, fromJSON, toJSON) would delete
 * a stored false. Move this single call into onInit when h709 makes onInit
 * unconditional. Do not also call it from onInit.
 *
 * It registers hidden. The checkbox is revealed from onInit, so an author
 * never sees a control that cannot do anything on a Hub with extensions off.
 */
registerCompleteTriggerNavigationProperty();

const completeTriggerNavigationExtension: ExtensionModule = {
  onInit: () => {
    installCompleteTriggerNavigationPatch();
    revealCompleteTriggerNavigationProperty();
  },
  // Creator-only help text, behind a dynamic import so the respondent chunk
  // does not evaluate survey-creator-core. useExtensionLoader catches a
  // rejected hook, so a ChunkLoadError is logged rather than unhandled.
  onCreatorReady: async () => {
    const { registerCompleteTriggerNavigationPropertyHelp } = await import(
      "./creator-bindings"
    );
    registerCompleteTriggerNavigationPropertyHelp();
  },
};

export { completeTriggerNavigationExtension };
