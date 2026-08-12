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

type ChoiceMediaFields = {
  group?: string;
  randomize?: boolean;
  imageLink?: string;
  imageHeight?: number | string;
  imageWidth?: number | string;
};

function choiceMediaFingerprint(item: ItemValue): string {
  const media = item as ItemValue & ChoiceMediaFields;
  let randomizePart = "";
  if (media.randomize === false) {
    randomizePart = "0";
  } else if (media.randomize === true) {
    randomizePart = "1";
  }

  return [
    media.group ?? "",
    randomizePart,
    media.imageLink ?? "",
    media.imageHeight ?? "",
    media.imageWidth ?? "",
  ].join("|");
}

/**
 * Fingerprint of value + display label / locale map + grouping/media fields so
 * label-only upgrades and priority/media changes count as a change.
 */
export function choiceDisplayFingerprint(item: ItemValue): string {
  const value = normalizeChoiceKey(item.value);
  const mediaPart = choiceMediaFingerprint(item);
  const locJson = item.locText?.getJson?.();

  if (locJson == null || locJson === "") {
    return `${value}:${String(item.text ?? "")}:${mediaPart}`;
  }

  if (typeof locJson === "string") {
    return `${value}:${locJson}:${mediaPart}`;
  }

  return `${value}:${JSON.stringify(locJson)}:${mediaPart}`;
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
 * fallback. Copies only display text / locText so grouping and media on the
 * freshly copied incoming choice are preserved.
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

  const locJson = existing.locText?.getJson?.();
  if (locJson != null && locJson !== "") {
    incoming.locText?.setJson?.(locJson);
  } else if (existing.text) {
    incoming.text = existing.text;
  }

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
