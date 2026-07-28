import type { DragCategorizePlacement } from "../types";
import { getDisplayLabel } from "./item-labels";
import { parsePlacement } from "./zone-helpers";

interface ItemLike {
  value: string | number;
  text?: string;
  imageUrl?: string;
}

/**
 * The shape both read-only viewers read. Deliberately structural rather than
 * DragCategorizeQuestion: the viewers also run on surfaces where the question
 * type was never registered and SurveyJS fell back to a generic question.
 */
interface QuestionLike {
  value?: unknown;
  zones?: ItemLike[];
  choices?: ItemLike[];
}

export interface AnswerItemDisplay {
  value: string;
  /** Empty when an image already identifies the item — see resolveAnswerZones. */
  text: string;
  imageUrl?: string;
}

export interface AnswerZoneDisplay {
  value: string;
  title: string;
  items: AnswerItemDisplay[];
}

/**
 * Caption for a placed item.
 *
 * `ItemValue.text` falls back to the item's value, so reading it directly
 * prints internal ids like "item1" for image-only items — which the runner
 * deliberately hides. Fall back to the value only when there is no image and
 * no label, because then it is the sole thing identifying the item and a blank
 * cell would be worse.
 */
function resolveItemText(item: ItemLike | undefined, value: string): string {
  const label = item ? getDisplayLabel(item) : "";
  if (label) return label;
  return item?.imageUrl ? "" : value;
}

function resolveItems(
  itemValues: string[],
  choices: ItemLike[],
): AnswerItemDisplay[] {
  return itemValues.map((itemValue) => {
    const choice = choices.find((c) => String(c.value) === itemValue);
    return {
      value: itemValue,
      text: resolveItemText(choice, itemValue),
      imageUrl: choice?.imageUrl,
    };
  });
}

/** Zones holding an answer that the question definition no longer declares. */
function resolveOrphanedZones(
  placement: DragCategorizePlacement,
  declaredZoneIds: Set<string>,
  choices: ItemLike[],
): AnswerZoneDisplay[] {
  return Object.keys(placement)
    .filter((zoneId) => !declaredZoneIds.has(zoneId))
    .filter((zoneId) => placement[zoneId].length > 0)
    .map((zoneId) => ({
      value: zoneId,
      // Only the stored id is left to name it by; the zone's title went with
      // the definition change.
      title: zoneId,
      items: resolveItems(placement[zoneId], choices),
    }));
}

/**
 * Builds the display model shared by the submission and PDF viewers.
 *
 * Zones the definition dropped are appended rather than skipped: a submission
 * is a record of what the respondent did, and editing the form afterwards
 * should not make their answers disappear from the viewer.
 */
export function resolveAnswerZones(
  question: QuestionLike,
): AnswerZoneDisplay[] {
  const placement = parsePlacement(question.value);
  const zones = question.zones ?? [];
  const choices = question.choices ?? [];
  const declaredZoneIds = new Set(zones.map((zone) => String(zone.value)));

  return [
    ...zones.map((zone) => {
      const zoneId = String(zone.value);
      return {
        value: zoneId,
        title: zone.text || zoneId,
        items: resolveItems(placement[zoneId] ?? [], choices),
      };
    }),
    ...resolveOrphanedZones(placement, declaredZoneIds, choices),
  ];
}
