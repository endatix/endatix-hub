import { ItemValue } from "survey-core";
import { normalizeChoiceKey } from "@/lib/utils/survey/choice-values";

/**
 * True when the choice has no usable display label (text missing or equal to value).
 * Lazy-load carry-forward often lands in this state before display values resolve.
 */
export function isUnresolvedChoiceLabel(item: ItemValue): boolean {
  const text = item.text;
  if (text == null || text === "") {
    return true;
  }

  return normalizeChoiceKey(text) === normalizeChoiceKey(item.value);
}

/**
 * Fingerprint of value + display label / locale map so label-only upgrades
 * (ID → "Sevilla", or richer locText) count as a change.
 */
export function choiceDisplayFingerprint(item: ItemValue): string {
  const value = normalizeChoiceKey(item.value);
  const locJson = item.locText?.getJson?.();

  if (locJson == null || locJson === "") {
    return `${value}:${String(item.text ?? "")}`;
  }

  if (typeof locJson === "string") {
    return `${value}:${locJson}`;
  }

  return `${value}:${JSON.stringify(locJson)}`;
}

export function haveCarryForwardChoicesChanged(
  current: ItemValue[],
  next: ItemValue[],
): boolean {
  if (current.length !== next.length) {
    return true;
  }

  for (let i = 0; i < next.length; i++) {
    if (
      choiceDisplayFingerprint(current[i]!) !==
      choiceDisplayFingerprint(next[i]!)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Prefer an already-resolved label on the target over an incoming ID-only
 * fallback. Prevents a late lazy-load sync from wiping labels back to numbers.
 * Mutates `incoming` only (the freshly copied target choice).
 */
export function preferResolvedChoiceLabel(
  incoming: ItemValue,
  existingByValue: Map<string, ItemValue>,
): ItemValue {
  const key = normalizeChoiceKey(incoming.value);
  if (!key || !isUnresolvedChoiceLabel(incoming)) {
    return incoming;
  }

  const existing = existingByValue.get(key);
  if (!existing || isUnresolvedChoiceLabel(existing)) {
    return incoming;
  }

  incoming.setData(existing);
  return incoming;
}

export function indexChoicesByValue(
  choices: ItemValue[],
): Map<string, ItemValue> {
  const byValue = new Map<string, ItemValue>();
  for (const choice of choices) {
    const key = normalizeChoiceKey(choice.value);
    if (key) {
      byValue.set(key, choice);
    }
  }
  return byValue;
}
