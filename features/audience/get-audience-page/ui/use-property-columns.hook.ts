"use client";

import { useState, useSyncExternalStore } from "react";
import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import {
  getHiddenPropertyColumns,
  getServerHiddenPropertyColumns,
  saveHiddenPropertyColumns,
  subscribeHiddenPropertyColumns,
} from "../hidden-property-columns.store";

export type PropertyColumns = {
  /** Every Property the list can show, in order: the Columns menu's choices. */
  properties: AudienceProperty[];
  /** The Properties the list shows as columns. */
  shown: AudienceProperty[];
  isShown: (property: AudienceProperty) => boolean;
  toggle: (property: AudienceProperty) => void;
};

/** The hidden ids after flipping one Property; ids no longer on the form drop out. */
function toggled(
  properties: AudienceProperty[],
  isShown: (property: AudienceProperty) => boolean,
  flip: AudienceProperty,
) {
  return properties
    .filter((p) => (p.id === flip.id ? isShown(p) : !isShown(p)))
    .map((p) => p.id);
}

/**
 * Which Property columns the Participants list shows, remembered per form in this browser. The
 * server render and hydration show every column; a saved choice applies right after. When
 * storage refuses the write, the choice lasts while the list stays open.
 */
export function usePropertyColumns(
  formId: string,
  properties: AudienceProperty[],
): PropertyColumns {
  const stored = useSyncExternalStore(
    subscribeHiddenPropertyColumns,
    () => getHiddenPropertyColumns(formId),
    getServerHiddenPropertyColumns,
  );
  // A failed write keeps the choice only while `stored` is the snapshot it was made against.
  // Another tab's save replaces that snapshot, so its choice shows without reopening the list.
  const [unsaved, setUnsaved] = useState<{
    when: readonly string[];
    ids: readonly string[];
  } | null>(null);
  const hidden = unsaved?.when === stored ? unsaved.ids : stored;
  const isShown = (property: AudienceProperty) => !hidden.includes(property.id);
  const toggle = (property: AudienceProperty) => {
    const next = toggled(properties, isShown, property);
    setUnsaved(
      saveHiddenPropertyColumns(formId, next) ? null : { when: stored, ids: next },
    );
  };
  const shown = properties.filter((p) => isShown(p));
  return { properties, shown, isShown, toggle };
}
