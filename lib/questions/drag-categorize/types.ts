/**
 * JSON shape of a draggable item in the question's `choices` array.
 * Extends the standard SurveyJS item value (`value` + localizable `text`).
 */
export interface DragCategorizeItem {
  value: string;
  text?: string;
  /** Storage URL set by the Creator's image picker (never base64). */
  imageUrl?: string;
  /** true = dragging copies the item into a zone; false/absent = moves it. */
  allowMultipleZones?: boolean;
}

/**
 * JSON shape of a drop zone in the question's `zones` array.
 * `text` is the zone title shown above the drop area (localizable).
 */
export interface DragCategorizeZone {
  value: string;
  text?: string;
  /** Minimum items the zone must hold; 0/absent = no minimum. */
  minItems?: number;
  /** Maximum items the zone may hold; 0/absent = unlimited. */
  maxItems?: number;
}

/**
 * Question value: zone id → item values placed in that zone.
 * Unplaced items are absent from every array.
 */
export type DragCategorizePlacement = Record<string, string[]>;
