"use client";

import { useSyncExternalStore } from "react";
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
  isShown: (property: AudienceProperty) => boolean;
  toggle: (property: AudienceProperty) => void;
};

/**
 * Which Property columns the Participants list shows, remembered per form in this browser. The
 * server render and the first client render show every column; a saved choice applies after.
 */
export function usePropertyColumns(
  formId: string,
  properties: AudienceProperty[],
): PropertyColumns {
  const hidden = useSyncExternalStore(
    subscribeHiddenPropertyColumns,
    () => getHiddenPropertyColumns(formId),
    getServerHiddenPropertyColumns,
  );
  const isShown = (property: AudienceProperty) => !hidden.includes(property.id);
  const toggle = (property: AudienceProperty) => {
    const next = properties
      .filter((p) => (p.id === property.id ? isShown(p) : !isShown(p)))
      .map((p) => p.id);
    saveHiddenPropertyColumns(formId, next);
  };
  return { properties, isShown, toggle };
}
