import { getLocaleStrings } from 'survey-creator-core';
import {
  ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
} from '../constants';

let isCreatorHelpRegistered = false;

export function registerAdvancedCarryForwardCreatorHelp(): void {
  if (isCreatorHelpRegistered) {
    return;
  }

  const translations = getLocaleStrings('en');

  translations.pehelp[ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY] =
    'Pins these choices to the top of the destination list in the order shown. ' +
    'To shuffle the rest while keeping priority items fixed, set Choices order to Random on the Choices tab.';

  translations.pehelp[ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY] =
    'Limits how many carried-forward choices appear in the destination list. ' +
    '0 means no limit. Priority items are always included; the cap applies to the remaining choices after priority.';

  isCreatorHelpRegistered = true;
}

export function resetAdvancedCarryForwardCreatorHelpForTests(): void {
  isCreatorHelpRegistered = false;
}
