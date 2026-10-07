import type { ExtensionModule } from "@/lib/survey-extensions/types";
import { registerScreenOutTrigger } from "./registry";

/**
 * Serializer.addClass runs at module scope, the same way survey-core registers
 * its own triggers. ENDATIX_ENABLE_EXTENSIONS defaults off, so onInit does not
 * run, and an unregistered trigger type is dropped when form JSON is parsed.
 * Move this call into onInit when h709 makes onInit unconditional.
 * Do not also call it from onInit.
 *
 * Creator labels are not part of Serializer. The form editor, template editor,
 * and preview call registerScreenOutLogicAction before new SurveyCreator.
 * Those modules already import survey-creator-core. This file does not.
 */
registerScreenOutTrigger();

const screenOutExtension: ExtensionModule = {};

export { screenOutExtension };
