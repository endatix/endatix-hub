export { getDisplayLabel, hasExplicitLabel } from "./item-labels";
export { resolveAnswerZones } from "./answer-display";
export type {
  AnswerItemDisplay,
  AnswerZoneDisplay,
} from "./answer-display";
export {
  getItemZones,
  isItemPlaced,
  isPlacementEmpty,
  parsePlacement,
  placeItem,
  reconcilePlacement,
} from "./zone-helpers";
export type {
  PlacementByItem,
  PlaceItemOptions,
  ReconcilePlacementOptions,
  ReconcilePlacementResult,
} from "./zone-helpers";
