import type { ItemValue } from "survey-core";
import { parseNumber } from "@/lib/utils/type-parsers";

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

/** Serializer / JSON may yield string or number; normalize at the parse boundary. */
export function parseCarryForwardMaxChoices(value: unknown): number {
  if (typeof value === "string" || typeof value === "number") {
    return parseNumber(value, 0);
  }

  return parseNumber(null, 0);
}
