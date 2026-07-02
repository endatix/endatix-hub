import type { ItemValue } from 'survey-core';

/**
 * Caps how many non-priority carried-forward choices appear when maxLimit >= 1.
 * Priority items are always kept in full (same rule as question-loops maxLoopCount).
 * 0 or negative maxLimit means unlimited.
 */
export function limitCarryForwardChoices(
  priority: ItemValue[],
  rest: ItemValue[],
  maxLimit: number,
): { priority: ItemValue[]; rest: ItemValue[] } {
  if (maxLimit < 1) {
    return { priority, rest };
  }

  const remainingSlots = Math.max(0, maxLimit - priority.length);

  return {
    priority,
    rest: rest.slice(0, remainingSlots),
  };
}

export function parseCarryForwardMaxChoices(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? 0), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
