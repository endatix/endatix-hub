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
  /**
   * Zone the drag started from; undefined when dragged from the pool. Only
   * consulted for clone items — see placeItem.
   */
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
 *
 * A non-clone item is cleared from every zone it currently occupies rather
 * than from the zone the drag reported starting in. The placement is the
 * source of truth; the drag origin is transient state that says nothing about
 * where the item actually sits. This keeps "at most one zone" true even when
 * the item started out in several — which happens when allowMultipleZones is
 * turned off after the item was already placed — so the next drag repairs it.
 *
 * Clone items are the opposite: each copy is independent, so only the zone the
 * copy was dragged out of may lose it.
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
  const detach = () => {
    if (clone) {
      removeFrom(fromZoneId);
      return;
    }
    for (const zoneId of Object.keys(next)) removeFrom(zoneId);
  };

  if (!toZoneId) {
    // Returned to the pool.
    detach();
    return next;
  }

  if (!clone) detach();

  const zoneItems = next[toZoneId] ?? [];
  if (!zoneItems.includes(itemValue)) {
    next[toZoneId] = [...zoneItems, itemValue];
  } else {
    next[toZoneId] = zoneItems;
  }

  return next;
}

/** Zones an item occupied, keyed by item value. */
export type PlacementByItem = Record<string, string[]>;

export interface ReconcilePlacementOptions {
  placement: DragCategorizePlacement;
  /** Zones that still exist in the question definition. */
  zoneIds: string[];
  /** Item values currently visible to the respondent. */
  visibleItemValues: string[];
  /**
   * Item values allowed in several zones at once. Every other item is held to
   * one zone; see reconcilePlacement.
   */
  multiZoneItemValues?: string[];
  /**
   * Zones to put back for items that became visible again, keyed by item
   * value. Entries for zones that no longer exist are ignored.
   */
  restore?: PlacementByItem;
}

export interface ReconcilePlacementResult {
  placement: DragCategorizePlacement;
  /**
   * Zones each item was dropped from because it is no longer visible. The
   * caller stashes these so the placement can be restored if the item comes
   * back. Items dropped because their zone is gone are not reported —
   * a deleted zone never returns.
   */
  removed: PlacementByItem;
  /** false when the placement is unchanged and needs no write. */
  changed: boolean;
}

/**
 * Single pass over a placement: drop zones that no longer exist, drop items
 * that are no longer visible (reporting where they were), re-add items coming
 * back from the stash, and hold non-clone items to a single zone.
 *
 * Mirrors how survey-core's checkbox treats choices hidden by
 * `visibleIf` / `choicesVisibleIf` — removed from the value but remembered,
 * so toggling the condition back restores the answer instead of destroying
 * it. See QuestionCheckboxModel.clearIncorrectAndDisabledValues.
 */
export function reconcilePlacement({
  placement,
  zoneIds,
  visibleItemValues,
  multiZoneItemValues,
  restore,
}: ReconcilePlacementOptions): ReconcilePlacementResult {
  const knownZones = new Set(zoneIds);
  const visibleItems = new Set(visibleItemValues);
  const multiZoneItems = new Set(multiZoneItemValues ?? []);

  let changed = false;
  const next: DragCategorizePlacement = {};
  const removed: PlacementByItem = {};

  for (const [zoneId, items] of Object.entries(placement)) {
    if (!knownZones.has(zoneId)) {
      changed = true;
      continue;
    }
    const kept: string[] = [];
    for (const itemValue of items) {
      if (visibleItems.has(itemValue)) {
        kept.push(itemValue);
        continue;
      }
      changed = true;
      removed[itemValue] = [...(removed[itemValue] ?? []), zoneId];
    }
    next[zoneId] = kept;
  }

  for (const [itemValue, zones] of Object.entries(restore ?? {})) {
    for (const zoneId of zones) {
      if (!knownZones.has(zoneId)) continue;
      const zoneItems = next[zoneId] ?? [];
      if (zoneItems.includes(itemValue)) continue;
      next[zoneId] = [...zoneItems, itemValue];
      changed = true;
    }
  }

  // An item that lost allowMultipleZones after it was placed can still sit in
  // several zones. Keep the first in zone-definition order — a stable choice
  // that does not depend on the value's key order — and drop the rest.
  const seen = new Set<string>();
  for (const zoneId of zoneIds) {
    const items = next[zoneId];
    if (!items) continue;
    const kept = items.filter((itemValue) => {
      if (multiZoneItems.has(itemValue)) return true;
      if (seen.has(itemValue)) return false;
      seen.add(itemValue);
      return true;
    });
    if (kept.length !== items.length) {
      next[zoneId] = kept;
      changed = true;
    }
  }

  return { placement: next, removed, changed };
}

/** true when no zone holds any item. */
export function isPlacementEmpty(
  placement: DragCategorizePlacement,
): boolean {
  return Object.values(placement).every((items) => items.length === 0);
}
