import type { ExtensionModule } from "@/lib/survey-extensions/types";
import { registerScreenOutTrigger } from "./registry";

/**
 * Serializer.addClass runs at module scope, the same way survey-core registers
 * its own triggers. The class is part of the form JSON schema: without it,
 * fromJSON → toJSON (Creator load, JSON editor save) drops a stored trigger.
 * ENDATIX_ENABLE_EXTENSIONS defaults off, so onInit is not safe for it.
 * Move this call into onInit when #709 makes onInit unconditional.
 */
registerScreenOutTrigger();

const screenOutExtension: ExtensionModule = {
  // Creator labels and the Logic tab action, behind a dynamic import so the
  // respondent chunk does not evaluate survey-creator-core. Needs
  // ENDATIX_ENABLE_EXTENSIONS=true until #709.
  onCreatorReady: async (creator) => {
    const { bindScreenOutToCreator } = await import("./creator-bindings");
    bindScreenOutToCreator(creator);
  },
};

export { screenOutExtension };
