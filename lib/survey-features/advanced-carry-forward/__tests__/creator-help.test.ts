import { getLocaleStrings } from 'survey-creator-core';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY,
  ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY,
  ADVANCED_CARRY_FORWARD_MODE_PROPERTY,
  ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
} from '../constants';
import {
  registerAdvancedCarryForwardCreatorHelp,
  resetAdvancedCarryForwardCreatorHelpForTests,
} from '../infrastructure/creator-help';

describe('registerAdvancedCarryForwardCreatorHelp', () => {
  beforeEach(() => {
    resetAdvancedCarryForwardCreatorHelpForTests();
  });

  it('registers pehelp text for priority items and max choices', () => {
    registerAdvancedCarryForwardCreatorHelp();

    const translations = getLocaleStrings('en');

    expect(
      translations.pehelp[ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY],
    ).toContain('build this question\'s choice list');
    expect(
      translations.pehelp[ADVANCED_CARRY_FORWARD_MODE_PROPERTY],
    ).toContain('Selected');
    expect(
      translations.pehelp[ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY],
    ).toContain('Choices order');
    expect(
      translations.pehelp[ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY],
    ).toContain('Priority items are always included');
  });

  it('clears pehelp text on reset instead of leaving it from a prior register', () => {
    registerAdvancedCarryForwardCreatorHelp();
    resetAdvancedCarryForwardCreatorHelpForTests();

    const translations = getLocaleStrings('en');

    expect(
      translations.pehelp[ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY],
    ).toBeUndefined();
    expect(
      translations.pehelp[ADVANCED_CARRY_FORWARD_MODE_PROPERTY],
    ).toBeUndefined();
    expect(
      translations.pehelp[ADVANCED_CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY],
    ).toBeUndefined();
    expect(
      translations.pehelp[ADVANCED_CARRY_FORWARD_MAX_CHOICES_PROPERTY],
    ).toBeUndefined();
  });
});
