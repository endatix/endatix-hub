import { SourceSelectionModes } from "@/lib/survey-features/question-loops/types";
import type { SourceSelectionMode } from "@/lib/survey-features/question-loops/types";
import {
  ROWS_SOURCE_SELECTION_ALL,
  ROWS_SOURCE_SELECTION_SELECTED_ONLY,
  ROWS_SOURCE_SELECTION_UNSELECTED_ONLY,
} from "../constants";

const MODE_MAP: Record<string, SourceSelectionMode> = {
  [ROWS_SOURCE_SELECTION_ALL]: SourceSelectionModes.All,
  [ROWS_SOURCE_SELECTION_SELECTED_ONLY]: SourceSelectionModes.SelectedOnly,
  [ROWS_SOURCE_SELECTION_UNSELECTED_ONLY]: SourceSelectionModes.UnselectedOnly,
};

/**
 * Maps edxRowsSourceSelectionMode's public JSON values (all/selectedOnly/
 * unselectedOnly) to getChoicesFromSourceQuestion's expected
 * SourceSelectionMode strings ("All"/"Selected Only"/"Unselected Only") —
 * the same translation carry-forward's own resolveCarryForwardSelectionMode
 * does for its edxCarryForwardMode property.
 */
export function resolveRowsSourceSelectionMode(
  mode: string | undefined,
): SourceSelectionMode {
  if (typeof mode === "string" && MODE_MAP[mode]) {
    return MODE_MAP[mode];
  }

  return SourceSelectionModes.All;
}
