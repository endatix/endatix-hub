import type { DragCategorizePlacement } from "../types";

/**
 * Normalizes an arbitrary question value into a safe placement record.
 * Drops non-array zone entries and non-scalar item values.
 */
export function parsePlacement(raw: unknown): DragCategorizePlacement {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const placement: DragCategorizePlacement = {};
  for (const [zoneId, items] of Object.entries(raw)) {
    if (!Array.isArray(items)) continue;
    placement[zoneId] = items
      .filter(
        (item) => typeof item === "string" || typeof item === "number",
      )
      .map((item) => String(item));
  }
  return placement;
}

/** Zone ids that currently contain the item. */
export function getItemZones(
  placement: DragCategorizePlacement,
  itemValue: string,
): string[] {
  return Object.keys(placement).filter((zoneId) =>
    placement[zoneId].includes(itemValue),
  );
}

/** true when the item is placed in at least one zone. */
export function isItemPlaced(
  placement: DragCategorizePlacement,
  itemValue: string,
): boolean {
  return getItemZones(placement, itemValue).length > 0;
}

export interface PlaceItemOptions {
  placement: DragCategorizePlacement;
  itemValue: string;
  /** Zone the drag started from; undefined when dragged from the pool. */
  fromZoneId?: string;
  /** Destination zone; undefined means "return to pool". */
  toZoneId?: string;
  /** true = copy into the destination, keep the source placement. */
  clone: boolean;
}

/**
 * Returns a new placement with the item moved, cloned, or returned to the
 * pool. Never mutates the input. Duplicate values within a zone are not
 * created.
 */
export function placeItem({
  placement,
  itemValue,
  fromZoneId,
  toZoneId,
  clone,
}: PlaceItemOptions): DragCategorizePlacement {
  const next: DragCategorizePlacement = {};
  for (const [zoneId, items] of Object.entries(placement)) {
    next[zoneId] = [...items];
  }

  const removeFrom = (zoneId: string | undefined) => {
    if (!zoneId || !next[zoneId]) return;
    next[zoneId] = next[zoneId].filter((value) => value !== itemValue);
  };

  if (!toZoneId) {
    // Return to pool: only the source zone loses the item.
    removeFrom(fromZoneId);
    return next;
  }

  if (!clone) {
    removeFrom(fromZoneId);
  }

  const zoneItems = next[toZoneId] ?? [];
  if (!zoneItems.includes(itemValue)) {
    next[toZoneId] = [...zoneItems, itemValue];
  } else {
    next[toZoneId] = zoneItems;
  }

  return next;
}

/**
 * Removes unknown zones and unknown item values from the placement.
 * Returns the original object when nothing needs to change.
 */
export function sanitizePlacement(
  placement: DragCategorizePlacement,
  zoneIds: string[],
  itemValues: string[],
): DragCategorizePlacement {
  const knownZones = new Set(zoneIds);
  const knownItems = new Set(itemValues);

  let changed = false;
  const next: DragCategorizePlacement = {};
  for (const [zoneId, items] of Object.entries(placement)) {
    if (!knownZones.has(zoneId)) {
      changed = true;
      continue;
    }
    const kept = items.filter((value) => knownItems.has(value));
    if (kept.length !== items.length) changed = true;
    next[zoneId] = kept;
  }

  return changed ? next : placement;
}

/** true when no zone holds any item. */
export function isPlacementEmpty(
  placement: DragCategorizePlacement,
): boolean {
  return Object.values(placement).every((items) => items.length === 0);
}
