import { SourceSelectionModes } from '@/lib/survey-features/question-loops/types';
import type { SourceSelectionMode } from '@/lib/survey-features/question-loops/types';
import { DEFAULT_ADVANCED_CARRY_FORWARD_MODE } from '../carry-forward-mode-values';

const LEGACY_MODE_MAP: Record<string, SourceSelectionMode> = {
  all: SourceSelectionModes.All,
  selected: SourceSelectionModes.SelectedOnly,
  unselected: SourceSelectionModes.UnselectedOnly,
  'selected only': SourceSelectionModes.SelectedOnly,
  'unselected only': SourceSelectionModes.UnselectedOnly,
};

/**
 * Maps advanced carry-forward mode JSON to question-loops selection mode.
 * Accepts native SurveyJS values (all/selected/unselected) and legacy loop labels.
 */
export function resolveCarryForwardSelectionMode(
  mode: string | undefined,
): SourceSelectionMode {
  if (typeof mode !== 'string' || !mode.trim()) {
    return LEGACY_MODE_MAP[DEFAULT_ADVANCED_CARRY_FORWARD_MODE];
  }

  const normalized = mode.trim().toLowerCase();
  return LEGACY_MODE_MAP[normalized] ?? SourceSelectionModes.All;
}
