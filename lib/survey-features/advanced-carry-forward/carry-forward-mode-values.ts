export const ADVANCED_CARRY_FORWARD_MODE_VALUES = [
  'all',
  'selected',
  'unselected',
] as const;

export type AdvancedCarryForwardModeValue =
  (typeof ADVANCED_CARRY_FORWARD_MODE_VALUES)[number];

/** Survey JSON / runtime input, including legacy loop labels normalized at sync time. */
export type AdvancedCarryForwardModeInput =
  AdvancedCarryForwardModeValue | string;

export const DEFAULT_ADVANCED_CARRY_FORWARD_MODE: AdvancedCarryForwardModeValue =
  'all';
