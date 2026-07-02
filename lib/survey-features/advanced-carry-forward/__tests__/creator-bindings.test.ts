import { SurveyModel } from 'survey-core';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ADVANCED_CARRY_FORWARD_CATEGORY,
  ADVANCED_CARRY_FORWARD_ICON_NAME,
} from '../constants';
import { decorateCarryForwardPropertyGridCategoryForTests } from '../infrastructure/creator-bindings';
import { registerAdvancedCarryForwardGlobals } from '../infrastructure/registry';

describe('creator-bindings property-grid decoration', () => {
  beforeEach(() => {
    registerAdvancedCarryForwardGlobals();
  });

  it('sets icon and title on the advancedCarryForward category page', () => {
    // Arrange
    const category = {
      title: 'advancedCarryForward',
      iconName: '',
    };
    const survey = {
      getPageByName: (pageName: string) =>
        pageName === ADVANCED_CARRY_FORWARD_CATEGORY ? category : null,
    } as unknown as SurveyModel;

    // Act
    decorateCarryForwardPropertyGridCategoryForTests(survey);

    // Assert
    expect(category.iconName).toBe(ADVANCED_CARRY_FORWARD_ICON_NAME);
    expect(category.title).toBe('Advanced Carry Forward');
  });
});
