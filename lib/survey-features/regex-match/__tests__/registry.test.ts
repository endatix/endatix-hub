import { Model } from 'survey-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerRegexMatchGlobals } from '../infrastructure/registry';

describe('registerRegexMatchGlobals', () => {
  beforeAll(() => {
    registerRegexMatchGlobals();
    registerRegexMatchGlobals();
  });

  it('evaluates regexMatch(...) == true for exactly 4 digits', () => {
    // Arrange
    const survey = new Model({
      elements: [{ type: 'text', name: 'code' }],
    });
    survey.data = { code: '1234' };

    // Act
    const result = survey.runCondition("regexMatch({code}, '^\\d{4}$') == true");

    // Assert
    expect(result).toBe(true);
  });

  it('evaluates Korean mobile phone pattern', () => {
    // Arrange
    const survey = new Model({
      elements: [{ type: 'text', name: 'phone' }],
    });
    survey.data = { phone: '010-1234-5678' };

    // Act
    const result = survey.runCondition(
      "regexMatch({phone}, '^01[016789]-?\\d{3,4}-?\\d{4}$') == true",
    );

    // Assert
    expect(result).toBe(true);
  });

  it('evaluates code format ABC-1234', () => {
    // Arrange
    const survey = new Model({
      elements: [{ type: 'text', name: 'refCode' }],
    });
    survey.data = { refCode: 'ABC-1234' };

    // Act
    const result = survey.runCondition(
      "regexMatch({refCode}, '^[A-Z]{3}-\\d{4}$') == true",
    );

    // Assert
    expect(result).toBe(true);
  });

  it('evaluates decimals with up to two places', () => {
    // Arrange
    const survey = new Model({
      elements: [{ type: 'text', name: 'amount' }],
    });
    survey.data = { amount: '12.50' };

    // Act
    const result = survey.runCondition(
      "regexMatch({amount}, '^\\d{1,3}(\\.\\d{1,2})?$') == true",
    );

    // Assert
    expect(result).toBe(true);
  });

  it('evaluates case-insensitive yes/no with flags', () => {
    // Arrange
    const survey = new Model({
      elements: [{ type: 'text', name: 'answer' }],
    });
    survey.data = { answer: 'YES' };

    // Act
    const result = survey.runCondition(
      "regexMatch({answer}, '^(yes|no)$', 'i') == true",
    );

    // Assert
    expect(result).toBe(true);
  });

  it('evaluates visibleIf-style condition without crashing on empty value', () => {
    // Arrange
    const survey = new Model({
      elements: [
        { type: 'text', name: 'q1' },
        {
          type: 'text',
          name: 'followUp',
          visibleIf: "regexMatch({q1}, '^\\d{4}$') == true",
        },
      ],
    });
    survey.data = { q1: '' };

    // Act
    const result = survey.runCondition("regexMatch({q1}, '^\\d{4}$') == true");

    // Assert
    expect(result).toBe(false);
    expect(survey.getQuestionByName('followUp')?.visible).toBe(false);
  });

  it('returns false for malformed regex without throwing', () => {
    // Arrange
    const survey = new Model({
      elements: [{ type: 'text', name: 'q1' }],
    });
    survey.data = { q1: 'value' };

    // Act & Assert
    expect(() =>
      survey.runCondition("regexMatch({q1}, '[invalid') == true"),
    ).not.toThrow();
    expect(survey.runCondition("regexMatch({q1}, '[invalid') == true")).toBe(
      false,
    );
  });
});
