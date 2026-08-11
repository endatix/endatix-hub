import type { ItemValue, QuestionMatrixModel } from "survey-core";
import type { AdvancedCarryForwardModeInput } from "@/lib/survey-features/carry-forward/carry-forward-mode-values";

export type DisplayMode = "grid" | "carousel";
export type ProgressIndicatorType = "text" | "bar";

/**
 * Row-sourcing reuses carry-forward's actual property names/settings shape
 * (edxCarryForward*, the same "advanced carry forward" feature checkbox/
 * radiogroup/etc. use) rather than a bespoke edxRowsSource* set, so scripters
 * see one consistent mental model — see sync-rows-from-source.ts.
 */
export interface MatrixCarouselQuestion extends QuestionMatrixModel {
  edxDisplayMode?: DisplayMode;
  showProgressIndicator?: boolean;
  progressIndicatorType?: ProgressIndicatorType;
  showNavigationButtons?: boolean;
  allowSwipeNavigation?: boolean;
  edxCarryForwardEnabled?: boolean;
  edxCarryForwardSources?: string[];
  edxCarryForwardMode?: AdvancedCarryForwardModeInput;
  edxCarryForwardPriorityItems?: string[];
  edxCarryForwardMaxChoices?: number;
}

/**
 * Matrix rows are plain `itemvalue` instances — matrix has no row-specific
 * item class (unlike columns, which use MatrixColumn). `imageUrl` is
 * registered on the shared itemvalue base and visibleIf-gated to matrix rows
 * (see registry.ts), so this type just documents the shape at the call site.
 */
export interface MatrixRowItemValue extends ItemValue {
  imageUrl?: string;
}

export interface CarouselRuntimeState {
  currentRowIndex: number;
}
