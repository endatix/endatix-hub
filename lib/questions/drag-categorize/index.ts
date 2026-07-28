/**
 * Drag Categorize — custom question letting respondents drag items into
 * named category zones.
 *
 * Single entry point for client surfaces. Pick the registration that
 * matches the surface:
 *
 * | Surface                             | Call                                 |
 * | ----------------------------------- | ------------------------------------ |
 * | Runner, previews, submission survey | registerDragCategorizeQuestion()     |
 * | Designer globals                    | registerDragCategorizeQuestionUI()   |
 * | Designer, per SurveyCreator         | bindDragCategorizeToCreator(creator) |
 *
 * Only designer surfaces should import this barrel. It re-exports the
 * Creator bindings, so importing it anywhere else drags survey-creator-core
 * along with them. Deep-import the entry for the surface instead:
 *
 * - server-side (PDF export) → `./drag-categorize.registry` (model only, no
 *   survey-react-ui and no stylesheet)
 * - runner / previews / submission survey → `./drag-categorize.component`
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
