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
    const expression = "regexMatch({code}, '^\\d{4}$') == true";
    survey.data = { code: '1234' };

    // Act
    const matchingResult = survey.runCondition(expression);
    survey.data = { code: '12345' };
    const nonMatchingResult = survey.runCondition(expression);

    // Assert
    expect(matchingResult).toBe(true);
    expect(nonMatchingResult).toBe(false);
  });

  it('evaluates Korean mobile phone pattern', () => {
    // Arrange
    const survey = new Model({
      elements: [{ type: 'text', name: 'phone' }],
    });
    const expression =
      "regexMatch({phone}, '^01[016789]-?\\d{3,4}-?\\d{4}$') == true";
    survey.data = { phone: '010-1234-5678' };

    // Act
    const matchingResult = survey.runCondition(expression);
    survey.data = { phone: '020-1234-5678' };
    const nonMatchingResult = survey.runCondition(expression);

    // Assert
    expect(matchingResult).toBe(true);
    expect(nonMatchingResult).toBe(false);
  });

  it('evaluates code format ABC-1234', () => {
    // Arrange
    const survey = new Model({
      elements: [{ type: 'text', name: 'refCode' }],
    });
    const expression = "regexMatch({refCode}, '^[A-Z]{3}-\\d{4}$') == true";
    survey.data = { refCode: 'ABC-1234' };

    // Act
    const matchingResult = survey.runCondition(expression);
    survey.data = { refCode: 'abc-1234' };
    const nonMatchingResult = survey.runCondition(expression);

    // Assert
    expect(matchingResult).toBe(true);
    expect(nonMatchingResult).toBe(false);
  });

  it('evaluates decimals with up to two places', () => {
    // Arrange
    const survey = new Model({
      elements: [{ type: 'text', name: 'amount' }],
    });
    const expression =
      "regexMatch({amount}, '^\\d{1,3}(\\.\\d{1,2})?$') == true";
    survey.data = { amount: '12.50' };

    // Act
    const matchingResult = survey.runCondition(expression);
    survey.data = { amount: '100.999' };
    const nonMatchingResult = survey.runCondition(expression);

    // Assert
    expect(matchingResult).toBe(true);
    expect(nonMatchingResult).toBe(false);
  });

  it('evaluates case-insensitive yes/no with flags', () => {
    // Arrange
    const survey = new Model({
      elements: [{ type: 'text', name: 'answer' }],
    });
    const expression = "regexMatch({answer}, '^(yes|no)$', 'i') == true";
    survey.data = { answer: 'YES' };

    // Act
    const matchingResult = survey.runCondition(expression);
    survey.data = { answer: 'maybe' };
    const nonMatchingResult = survey.runCondition(expression);

    // Assert
    expect(matchingResult).toBe(true);
    expect(nonMatchingResult).toBe(false);
  });

  it('evaluates visibleIf and toggles follow-up visibility when the value matches', () => {
    // Arrange
    const expression = "regexMatch({q1}, '^\\d{4}$') == true";
    const survey = new Model({
      elements: [
        { type: 'text', name: 'q1' },
        {
          type: 'text',
          name: 'followUp',
          visibleIf: expression,
        },
      ],
    });
    const followUp = survey.getQuestionByName('followUp');

    // Act
    survey.data = { q1: '' };
    const emptyResult = survey.runCondition(expression);

    // Assert
    expect(emptyResult).toBe(false);
    expect(followUp?.visible).toBe(false);

    // Act
    survey.data = { q1: '1234' };
    const matchingResult = survey.runCondition(expression);

    // Assert
    expect(matchingResult).toBe(true);
    expect(followUp?.visible).toBe(true);
  });

  it('returns false for cleared checkbox selections', () => {
    // Arrange
    const survey = new Model({
      elements: [
        { type: 'checkbox', name: 'q1', choices: ['a', 'b'] },
      ],
    });
    const expression = "regexMatch({q1}, '.*') == true";
    survey.data = { q1: [] };

    // Act
    const result = survey.runCondition(expression);

    // Assert
    expect(result).toBe(false);
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
