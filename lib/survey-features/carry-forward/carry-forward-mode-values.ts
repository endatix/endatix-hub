export const CARRY_FORWARD_MODE_VALUES = [
  "all",
  "selected",
  "unselected",
] as const;

export type AdvancedCarryForwardModeValue =
  (typeof CARRY_FORWARD_MODE_VALUES)[number];

/** Survey JSON / runtime input, including legacy loop labels normalized at sync time. */
export type AdvancedCarryForwardModeInput =
  | AdvancedCarryForwardModeValue
  | string;

export const DEFAULT_CARRY_FORWARD_MODE: AdvancedCarryForwardModeValue =
  "all";
