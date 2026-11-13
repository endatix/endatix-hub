import { designerDataListChoiceSource } from "@/features/data-lists/designer-choices";
import type {
  ExtensionRuntimeDeps,
  ExtensionRuntimeState,
} from "@/lib/survey-extensions/types";

/** Extension deps for the form designer: data lists preview through the staff API. */
export function designerRuntimeDeps(stateRef: {
  readonly current: ExtensionRuntimeState;
}): ExtensionRuntimeDeps {
  return {
    getRuntimeState: () => stateRef.current,
    dataListChoices: designerDataListChoiceSource,
  };
}
