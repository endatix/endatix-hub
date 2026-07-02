import { ItemValue } from 'survey-core';
import { describe, expect, it } from 'vitest';
import {
  limitCarryForwardChoices,
  parseCarryForwardMaxChoices,
} from '../use-cases/limit-carry-forward-choices';

function choice(value: string): ItemValue {
  return new ItemValue(value, value);
}

describe('limitCarryForwardChoices', () => {
  it('returns all choices when max limit is 0', () => {
    const priority = [choice('A')];
    const rest = [choice('B'), choice('C')];

    const result = limitCarryForwardChoices(priority, rest, 0);

    expect(result.priority).toEqual(priority);
    expect(result.rest).toEqual(rest);
  });

  it('always keeps all priority items even when they exceed the max', () => {
    const priority = [choice('A'), choice('B'), choice('C')];
    const rest = [choice('D')];

    const result = limitCarryForwardChoices(priority, rest, 2);

    expect(result.priority.map((item) => item.value)).toEqual(['A', 'B', 'C']);
    expect(result.rest).toEqual([]);
  });

  it('limits non-priority choices after reserving priority slots', () => {
    const priority = [choice('A')];
    const rest = [choice('B'), choice('C'), choice('D')];

    const result = limitCarryForwardChoices(priority, rest, 3);

    expect(result.priority.map((item) => item.value)).toEqual(['A']);
    expect(result.rest.map((item) => item.value)).toEqual(['B', 'C']);
  });
});

describe('parseCarryForwardMaxChoices', () => {
  it('parses numeric values and defaults invalid input to 0', () => {
    expect(parseCarryForwardMaxChoices(5)).toBe(5);
    expect(parseCarryForwardMaxChoices('3')).toBe(3);
    expect(parseCarryForwardMaxChoices(undefined)).toBe(0);
    expect(parseCarryForwardMaxChoices('abc')).toBe(0);
  });
});
