import { getLocaleStrings } from "survey-creator-core";
import type { SurveyCreatorModel } from "survey-creator-core";
import {
  DRAG_CATEGORIZE_DISPLAY_NAME,
  DRAG_CATEGORIZE_TYPE,
  MIN_ZONES,
  ZONES_PROPERTY,
} from "./constants";
import { registerDragCategorizeQuestion } from "./drag-categorize.component";

const CREATOR_BOUND_KEY = "__endatixDragCategorizeCreatorBound";

/**
 * Designer globals (display name, pehelp). Called from bindDragCategorizeToCreator.
 * The toolbox icon is registered eagerly in drag-categorize.extension.ts's
 * onInit instead of here — see the comment there for why.
 */
export function registerDragCategorizeQuestionUI(): void {
  registerDragCategorizeQuestion();

  const translations = getLocaleStrings("en");

  // Without a `qt` entry the Creator falls back to the raw type name, so the
  // toolbox and the question type dropdown read "dragcategorize".
  if (translations.qt) {
    translations.qt[DRAG_CATEGORIZE_TYPE] = DRAG_CATEGORIZE_DISPLAY_NAME;
  }

  if (translations.pehelp) {
    translations.pehelp[DRAG_CATEGORIZE_TYPE] = {
      choices:
        "Draggable items. Enable 'Allow in multiple zones' per item to copy it into zones instead of moving it.",
      zones:
        "Target drop zones. Set min/max items to constrain how many items each zone must hold.",
      requireAllItems:
        "When enabled, the respondent must place every item into a zone before advancing.",
      zoneMinWidth:
        "Minimum width of each zone in pixels. Zones share every row equally and wrap to a new row when they would get narrower than this.",
      showItemLabels:
        "Display each item's Text under its image. Items without an image always show their text. Turn this off for purely visual sorting tasks.",
    };
  }
}

/**
 * Per-creator-instance wiring: toolbox placement and default JSON, the
 * minimum-zone guard, and zone naming. Idempotent per creator.
 */
export function bindDragCategorizeToCreator(
  creator: SurveyCreatorModel,
): void {
  const creatorRecord = creator as unknown as Record<string, unknown>;
  if (creatorRecord[CREATOR_BOUND_KEY]) return;
  creatorRecord[CREATOR_BOUND_KEY] = true;

  registerDragCategorizeQuestionUI();
  creator.toolbox.changeCategory(DRAG_CATEGORIZE_TYPE, "choice");

  // New questions start with the minimum viable zone setup.
  const toolboxItem = creator.toolbox.getItemByName(DRAG_CATEGORIZE_TYPE);
  if (toolboxItem) {
    toolboxItem.json = {
      ...toolboxItem.json,
      type: DRAG_CATEGORIZE_TYPE,
      zones: [{ value: "zone1" }, { value: "zone2" }],
    };
  }

  // Categorization needs at least MIN_ZONES zones — block deleting below it.
  creator.onCollectionItemAllowOperations.add((_, options) => {
    if (
      options.propertyName !== ZONES_PROPERTY ||
      options.element?.getType() !== DRAG_CATEGORIZE_TYPE
    ) {
      return;
    }
    // Leave the decision alone when the collection is missing: treating it as
    // length 0 would satisfy the guard and forbid every delete instead.
    if (!options.collection) return;
    if (options.collection.length <= MIN_ZONES) {
      options.allowDelete = false;
    }
  });

  // The property grid names new collection items item1..itemN; zones should
  // read zone1..zoneN instead.
  creator.onItemValueAdded.add((_, options) => {
    if (
      options.propertyName !== ZONES_PROPERTY ||
      options.element?.getType() !== DRAG_CATEGORIZE_TYPE
    ) {
      return;
    }
    const used = new Set(
      options.itemValues
        .filter((item) => item !== options.newItem)
        .map((item) => String(item.value)),
    );
    let index = used.size + 1;
    while (used.has(`zone${index}`)) index++;
    options.newItem.value = `zone${index}`;
  });
}
