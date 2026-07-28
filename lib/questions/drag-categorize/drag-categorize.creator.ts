import { SvgRegistry } from "survey-core";
import { getLocaleStrings } from "survey-creator-core";
import type { SurveyCreatorModel } from "survey-creator-core";
import { DRAG_CATEGORIZE_TYPE, ZONES_PROPERTY } from "../constants";
import { DRAG_CATEGORIZE_SVG } from "./drag-categorize-icon";

const CREATOR_BOUND_KEY = "__endatixDragCategorizeCreatorBound";

/**
 * Designer-only wiring: toolbox placement, icon, and property-grid help
 * texts. Question/serializer registration lives in registry.ts.
 */
export function bindDragCategorizeToCreator(
  creator: SurveyCreatorModel,
): void {
  const creatorRecord = creator as unknown as Record<string, unknown>;
  if (creatorRecord[CREATOR_BOUND_KEY]) return;
  creatorRecord[CREATOR_BOUND_KEY] = true;

  SvgRegistry.registerIcon(DRAG_CATEGORIZE_TYPE, DRAG_CATEGORIZE_SVG);
  creator.toolbox.changeCategory(DRAG_CATEGORIZE_TYPE, "choice");

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

  const translations = getLocaleStrings("en");
  if (translations.pehelp) {
    translations.pehelp[DRAG_CATEGORIZE_TYPE] = {
      choices:
        "Draggable items. Enable 'Allow in multiple zones' per item to copy it into zones instead of moving it.",
      zones:
        "Target drop zones. Set min/max items to constrain how many items each zone must hold.",
      requireAllItems:
        "When enabled, the respondent must place every item into a zone before advancing.",
    };
  }
}
