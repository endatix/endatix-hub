export const ADVANCED_CARRY_FORWARD_EXTENSION_ID = 'advanced-carry-forward';

export const ADVANCED_CARRY_FORWARD_CATEGORY = 'advancedCarryForward';

/** Question types that extend QuestionSelectBase (Serializer registration). */
export const ADVANCED_CARRY_FORWARD_QUESTION_TYPES = [
  'checkbox',
  'radiogroup',
  'dropdown',
  'tagbox',
  'imagepicker',
  'ranking',
  'buttongroup',
] as const;

export const ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY =
  'advancedCarryForwardEnabled';
export const ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY =
  'advancedCarryForwardSources';
export const ADVANCED_CARRY_FORWARD_MODE_PROPERTY = 'advancedCarryForwardMode';
export const ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY =
  'advancedCarryForwardPriorityItems';
export const ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY =
  'advancedCarryForwardMaxChoices';

export const ADVANCED_CARRY_FORWARD_HANDLERS_ATTACHED_KEY =
  '__endatixAdvancedCarryForwardBound';

export const ADVANCED_CARRY_FORWARD_ICON_NAME = 'icon-advanced-carry-forward';

export const ADVANCED_CARRY_FORWARD_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><style>.st0{fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px}</style></defs><path class="st0" d="M4 10h12"/><path class="st0" d="M4 16h12"/><path class="st0" d="M4 22h12"/><path class="st0" d="M20 16h8"/><path class="st0" d="m24 12 4 4-4 4"/></svg>';
