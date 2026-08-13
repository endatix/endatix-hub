import { ItemValue } from "survey-core";
import {
  hasCatalogLabelMap,
  readCatalogLabels,
} from "@/lib/utils/survey/choice-display";
import { normalizeChoiceKey } from "@/lib/utils/survey/choice-values";

export { hasCatalogLabelMap, readCatalogLabels } from "@/lib/utils/survey/choice-display";

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
 * Prefer a catalog label map already on the target over an incoming identity
 * fallback. Copies only display text / locText so grouping and media on the
 * freshly copied incoming choice are preserved.
 */
export function preferResolvedChoiceLabel(
  incoming: ItemValue,
  existingByValue: Map<string, ItemValue>,
): ItemValue {
  const key = normalizeChoiceKey(incoming.value);
  if (!key) {
    return incoming;
  }

  const existing = existingByValue.get(key);
  if (
    !existing ||
    !hasCatalogLabelMap(existing) ||
    hasCatalogLabelMap(incoming)
  ) {
    return incoming;
  }

  const labels = readCatalogLabels(existing);
  if (typeof incoming.locText?.setJson === "function") {
    incoming.locText.setJson(labels);
  }

  // Flat text fallback when setJson was a no-op.
  if (!hasCatalogLabelMap(incoming) && existing.pureText) {
    try {
      incoming.text = existing.pureText;
    } catch {
      // SurveyJS ItemValue.text requires locText; ignore if unsettable.
    }
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
