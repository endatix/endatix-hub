export const ADVANCED_CARRY_FORWARD_MODE_VALUES = [
  'all',
  'selected',
  'unselected',
] as const;

export type AdvancedCarryForwardModeValue =
  (typeof ADVANCED_CARRY_FORWARD_MODE_VALUES)[number];

export const DEFAULT_ADVANCED_CARRY_FORWARD_MODE: AdvancedCarryForwardModeValue =
  'all';
