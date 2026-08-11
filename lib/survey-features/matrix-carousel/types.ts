import type { ItemValue, QuestionMatrixModel } from "survey-core";

export type DisplayMode = "grid" | "carousel";
export type ProgressIndicatorType = "text" | "bar";
export type RowsSourceSelectionMode = "all" | "selectedOnly" | "unselectedOnly";

export interface MatrixCarouselQuestion extends QuestionMatrixModel {
  edxDisplayMode?: DisplayMode;
  showProgressIndicator?: boolean;
  progressIndicatorType?: ProgressIndicatorType;
  showNavigationButtons?: boolean;
  allowSwipeNavigation?: boolean;
  edxRowsSourceEnabled?: boolean;
  edxRowsSourceQuestion?: string;
  edxRowsSourceSelectionMode?: RowsSourceSelectionMode;
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
