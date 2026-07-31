/**
 * Drag Categorize question. Registration lives in the extensions framework —
 * see `.agents/skills/add-survey-feature/SKILL.md` §11.
 *
 * Avoid importing this barrel from respondent graphs (re-exports Creator).
 * PDF: deep-import `./drag-categorize.registry`.
 */
export {
  DEFAULT_ZONE_MIN_WIDTH,
  DRAG_CATEGORIZE_DISPLAY_NAME,
  DRAG_CATEGORIZE_EXTENSION_ID,
  DRAG_CATEGORIZE_TYPE,
  MIN_ZONES,
  POOL_ZONE_ID,
} from "./constants";

export {
  DragCategorizeComponent,
  registerDragCategorizeQuestion,
} from "./drag-categorize.component";
export {
  bindDragCategorizeToCreator,
  registerDragCategorizeQuestionUI,
} from "./drag-categorize.creator";
export { dragCategorizeExtension } from "./drag-categorize.extension";
export {
  DragCategorizeItemValue,
  DragCategorizeZoneItemValue,
} from "./drag-categorize.item-values";
export { DragCategorizeQuestion } from "./drag-categorize.model";
export { DragCategorizeAnswer } from "./drag-categorize.answer";

export type {
  DragCategorizeItem,
  DragCategorizePlacement,
  DragCategorizeZone,
} from "./types";
