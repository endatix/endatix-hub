import { getLocaleStrings } from 'survey-creator-core';
import {
  ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
  ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY,
} from '../constants';

let isCreatorHelpRegistered = false;

export function registerAdvancedCarryForwardCreatorHelp(): void {
  if (isCreatorHelpRegistered) {
    return;
  }

  const translations = getLocaleStrings('en');

  translations.pehelp[ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY] =
    'Enable this option if you need to build this question\'s choice list from one or more earlier questions while prioritizing specific choices or limiting their number.';

  translations.pehelp[ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY] =
    'Select one or more earlier choice questions to copy options from. Only select-based questions appear here, and the current question is excluded.';

  translations.pehelp[ADVANCED_CARRY_FORWARD_MODE_PROPERTY] =
    'Choose from: "All" - copies all choice options from the selected questions; "Selected" - dynamically copies only selected choice options; "Unselected" - dynamically copies only unselected choice options. ' +
    'For ranking source questions, Selected and Unselected follow the ranking value (often the full ranked list), not a partial checkbox-style selection.';

  translations.pehelp[ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY] =
    'Pins these choices to the top of the destination list in the order shown. ' +
    'To shuffle the rest while keeping priority items fixed, set Choices order to Random on the Choices tab.';

  translations.pehelp[ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY] =
    'Limits how many carried-forward choices appear in the destination list. ' +
    '0 means no limit. Priority items are always included; the cap applies to the remaining choices after priority.';

  isCreatorHelpRegistered = true;
}

export function resetAdvancedCarryForwardCreatorHelpForTests(): void {
  const translations = getLocaleStrings('en');

  delete translations.pehelp[ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY];
  delete translations.pehelp[ADVANCED_CARRY_FORWARD_SOURCES_PROPERTY];
  delete translations.pehelp[ADVANCED_CARRY_FORWARD_MODE_PROPERTY];
  delete translations.pehelp[ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY];
  delete translations.pehelp[ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY];

  isCreatorHelpRegistered = false;
}
