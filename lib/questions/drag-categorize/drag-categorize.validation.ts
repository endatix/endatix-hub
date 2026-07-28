import { CustomError, SurveyError } from "survey-core";
import type { DragCategorizePlacement } from "./types";
import { isItemPlaced } from "./utils";

interface ItemLike {
  value: string;
}

interface ZoneLike {
  value: string;
  text?: string;
  minItems?: number;
  maxItems?: number;
}

export interface ZoneConstraintSource {
  requireAllItems: boolean;
  placement: DragCategorizePlacement;
  /** Items the respondent can drag (question.visibleChoices). */
  items: ItemLike[];
  zones: ZoneLike[];
  /** Error owner passed to SurveyError so messages anchor to the question. */
  errorOwner?: unknown;
}

function zoneTitle(zone: ZoneLike): string {
  return zone.text || zone.value;
}

/**
 * Pure zone-constraint validation: requireAllItems plus per-zone min/max.
 * Returns the errors to append in the question's onCheckForErrors.
 */
export function validateZoneConstraints(
  source: ZoneConstraintSource,
): SurveyError[] {
  const errors: SurveyError[] = [];
  const { placement, zones, items, errorOwner } = source;

  if (source.requireAllItems) {
    const unplaced = items.filter(
      (item) => !isItemPlaced(placement, item.value),
    );
    if (unplaced.length > 0) {
      errors.push(
        new CustomError(
          "Please place all items before continuing.",
          errorOwner as never,
        ),
      );
    }
  }

  for (const zone of zones) {
    const count = (placement[zone.value] ?? []).length;
    if (zone.minItems && count < zone.minItems) {
      errors.push(
        new CustomError(
          `"${zoneTitle(zone)}" needs at least ${zone.minItems} item(s).`,
          errorOwner as never,
        ),
      );
    }
    if (zone.maxItems && count > zone.maxItems) {
      errors.push(
        new CustomError(
          `"${zoneTitle(zone)}" allows at most ${zone.maxItems} item(s).`,
          errorOwner as never,
        ),
      );
    }
  }

  return errors;
}
