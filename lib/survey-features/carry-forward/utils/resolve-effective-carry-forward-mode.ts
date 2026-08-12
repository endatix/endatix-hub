import type { QuestionSelectBase } from "survey-core";
import {
  SourceSelectionModes,
  type SourceSelectionMode,
} from "@/lib/survey-features/question-loops/types";

type LazyChoiceSource = QuestionSelectBase & {
  choicesLazyLoadEnabled?: boolean;
};

/**
 * True when the source loads choices on demand (e.g. data-list binding).
 * Full catalogs are never materialized in `visibleChoices`, so All /
 * Unselected cannot be computed accurately.
 */
export function isLazyLoadedChoiceSource(
  source: QuestionSelectBase,
): boolean {
  return (source as LazyChoiceSource).choicesLazyLoadEnabled === true;
}

/**
 * Per-source effective mode for carry-forward aggregation.
 * Lazy-loaded sources always contribute Selected Only so off-page
 * selections stay correct without eagerly loading the full catalog.
 */
export function resolveEffectiveCarryForwardModeForSource(
  source: QuestionSelectBase,
  requestedMode: SourceSelectionMode,
): SourceSelectionMode {
  if (
    isLazyLoadedChoiceSource(source) &&
    requestedMode !== SourceSelectionModes.SelectedOnly
  ) {
    return SourceSelectionModes.SelectedOnly;
  }

  return requestedMode;
}
