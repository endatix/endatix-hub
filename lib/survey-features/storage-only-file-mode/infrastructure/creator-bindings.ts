import type { SurveyCreatorModel } from "survey-creator-core";
import { bindSurveyToCreatorAreas } from "@/lib/survey-features/infrastructure/creator-survey-bindings";
import { STORAGE_ONLY_FILE_MODE_CREATOR_BOUND_KEY } from "../constants";
import { bindStorageOnlyFileModeToSurvey } from "./survey-bindings";

/**
 * Binds storage-only file mode to every Creator survey instance (designer +
 * preview tabs). Call only when a storage provider is enabled — see
 * registerStorageOnlyFileModeGlobals for the paired property-grid change.
 */
export function bindStorageOnlyFileModeToCreator(
  creator: SurveyCreatorModel,
): () => void {
  return bindSurveyToCreatorAreas(
    creator,
    STORAGE_ONLY_FILE_MODE_CREATOR_BOUND_KEY,
    bindStorageOnlyFileModeToSurvey,
  );
}
