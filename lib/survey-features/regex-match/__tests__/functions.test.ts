import { describe, expect, it } from 'vitest';
import { regexMatchFunction } from '../functions';

describe('regexMatchFunction', () => {
  it('returns true when value matches pattern', () => {
    // Arrange
    const params = ['1234', '^\\d{4}$'];

    // Act
    const result = regexMatchFunction(params);

    // Assert
    expect(result).toBe(true);
  });

  it('returns false when value does not match pattern', () => {
    // Arrange
    const params = ['12345', '^\\d{4}$'];

    // Act
    const result = regexMatchFunction(params);

    // Assert
    expect(result).toBe(false);
  });

  it('returns false for null, undefined, empty string, or empty array value', () => {
    expect(regexMatchFunction([null, '^\\d+$'])).toBe(false);
    expect(regexMatchFunction([undefined, '^\\d+$'])).toBe(false);
    expect(regexMatchFunction(['', '^\\d+$'])).toBe(false);
    expect(regexMatchFunction([[], '^\\d+$'])).toBe(false);
    expect(regexMatchFunction([[], '.*'])).toBe(false);
  });

  it('returns false for non-array params without throwing', () => {
    // Act & Assert
    expect(() => regexMatchFunction({} as unknown as unknown[])).not.toThrow();
    expect(regexMatchFunction({} as unknown as unknown[])).toBe(false);
  });

  it('returns false for missing, non-string, or empty pattern', () => {
    expect(regexMatchFunction(['1234'])).toBe(false);
    expect(regexMatchFunction(['1234', null])).toBe(false);
    expect(regexMatchFunction(['1234', 123])).toBe(false);
    expect(regexMatchFunction(['1234', ''])).toBe(false);
  });

  it('returns false for invalid regex syntax without throwing', () => {
    // Act & Assert
    expect(() => regexMatchFunction(['value', '[invalid'])).not.toThrow();
    expect(regexMatchFunction(['value', '[invalid'])).toBe(false);
  });

  it('coerces non-string values to string before matching', () => {
    expect(regexMatchFunction([1234, '^\\d{4}$'])).toBe(true);
    expect(regexMatchFunction([0, '^0$'])).toBe(true);
    expect(regexMatchFunction([true, '^true$'])).toBe(true);
  });

  it('matches Korean mobile phone pattern', () => {
    expect(
      regexMatchFunction(['010-1234-5678', '^01[016789]-?\\d{3,4}-?\\d{4}$']),
    ).toBe(true);
    expect(
      regexMatchFunction(['01012345678', '^01[016789]-?\\d{3,4}-?\\d{4}$']),
    ).toBe(true);
    expect(
      regexMatchFunction(['020-1234-5678', '^01[016789]-?\\d{3,4}-?\\d{4}$']),
    ).toBe(false);
  });

  it('matches code format ABC-1234', () => {
    expect(regexMatchFunction(['ABC-1234', '^[A-Z]{3}-\\d{4}$'])).toBe(true);
    expect(regexMatchFunction(['abc-1234', '^[A-Z]{3}-\\d{4}$'])).toBe(false);
  });

  it('matches decimals with up to two places', () => {
    expect(regexMatchFunction(['1', '^\\d{1,3}(\\.\\d{1,2})?$'])).toBe(true);
    expect(regexMatchFunction(['12.5', '^\\d{1,3}(\\.\\d{1,2})?$'])).toBe(true);
    expect(regexMatchFunction(['100.99', '^\\d{1,3}(\\.\\d{1,2})?$'])).toBe(
      true,
    );
    expect(regexMatchFunction(['100.999', '^\\d{1,3}(\\.\\d{1,2})?$'])).toBe(
      false,
    );
  });

  it('supports optional case-insensitive flags', () => {
    expect(regexMatchFunction(['YES', '^(yes|no)$', 'i'])).toBe(true);
    expect(regexMatchFunction(['No', '^(yes|no)$', 'i'])).toBe(true);
    expect(regexMatchFunction(['maybe', '^(yes|no)$', 'i'])).toBe(false);
  });

  it('returns false for patterns that risk catastrophic backtracking', () => {
    // Act & Assert
    expect(() =>
      regexMatchFunction(['aaaaaaaaaaaaaaaaaaaa!', '(a+)+$']),
    ).not.toThrow();
    expect(regexMatchFunction(['aaaaaaaaaaaaaaaaaaaa!', '(a+)+$'])).toBe(false);
    expect(regexMatchFunction(['text', '(.*)*$'])).toBe(false);
  });

  it('returns false for overly long patterns or values', () => {
    expect(regexMatchFunction(['x', `${'a'.repeat(257)}$`])).toBe(false);
    expect(regexMatchFunction(['x'.repeat(2049), '^x$'])).toBe(false);
  });
});
