import { ItemValue, Question } from "survey-core";
import type { DataListChoiceItem } from "@/lib/endatix-api/data-lists/types";
import { DATA_LIST_ITEM_MAX_LENGTH } from "../constants";
import { resolveLocalizedText } from "./survey-localized-text";

export type NormalizeChoicesResult =
  | { ok: true; items: DataListChoiceItem[] }
  | { ok: false; error: string };

function extractLabelAndValueFromChoice(
  raw: unknown,
  index: number,
): { ok: true; label: string; value: string } | { ok: false; error: string } {
  let label: string;
  let value: string;

  if (typeof raw === "string") {
    label = raw;
    value = raw;
  } else if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    let text = "";
    if (typeof o.text === "string") {
      text = o.text;
    } else if (o.text !== undefined && o.text !== null) {
      text = resolveLocalizedText(o.text);
    } else if (typeof o.html === "string") {
      text = o.html;
    } else if (o.html !== undefined && o.html !== null) {
      text = resolveLocalizedText(o.html);
    }
    const val =
      o.value !== undefined && o.value !== null ? String(o.value) : "";
    const locDefault =
      o.locText &&
      typeof o.locText === "object" &&
      (o.locText as { text?: string }).text;
    label =
      text.trim() ||
      (typeof locDefault === "string" ? locDefault.trim() : "") ||
      val;
    value = val || label;
  } else {
    return {
      ok: false,
      error: `Unsupported choice format at index ${index}.`,
    };
  }

  if (!label.trim() || !value.trim()) {
    return {
      ok: false,
      error: `Choice at index ${index} is missing a label or value.`,
    };
  }

  if (label.length > DATA_LIST_ITEM_MAX_LENGTH) {
    return {
      ok: false,
      error: `Choice label exceeds ${DATA_LIST_ITEM_MAX_LENGTH} characters (index ${index}).`,
    };
  }
  if (value.length > DATA_LIST_ITEM_MAX_LENGTH) {
    return {
      ok: false,
      error: `Choice value exceeds ${DATA_LIST_ITEM_MAX_LENGTH} characters (index ${index}).`,
    };
  }

  return { ok: true, label, value };
}

/**
 * Normalizes Survey choice values to API data list items.
 */
export function normalizeChoicesToDataListItems(
  choices: unknown,
): NormalizeChoicesResult {
  if (!Array.isArray(choices) || choices.length === 0) {
    return { ok: false, error: "No choices to convert." };
  }

  const items: DataListChoiceItem[] = [];
  const seenValues = new Set<string>();

  for (let i = 0; i < choices.length; i++) {
    const extracted = extractLabelAndValueFromChoice(choices[i], i);
    if (!extracted.ok) {
      return extracted;
    }

    const { label, value } = extracted;
    if (seenValues.has(value)) {
      return {
        ok: false,
        error: `Duplicate choice value: ${value}`,
      };
    }
    seenValues.add(value);
    items.push({ label, value });
  }

  return { ok: true, items };
}

function resolveItemValueLabel(iv: ItemValue): string {
  if (typeof iv.text === "string") {
    return iv.text;
  }
  if (iv.text !== undefined && iv.text !== null) {
    return resolveLocalizedText(iv.text as unknown);
  }
  return "";
}

/**
 * Reads plain choice label/value pairs from a Survey question for data list import.
 */
export function getPlainChoiceValuesForNormalization(q: Question): unknown[] {
  return q.choices.map((iv: ItemValue) => {
    const anyIv = iv as { toJSON?: () => unknown };
    const json = typeof anyIv.toJSON === "function" ? anyIv.toJSON() : null;
    if (json && typeof json === "object") {
      const o = json as Record<string, unknown>;
      const textFromJson =
        typeof o.text === "string"
          ? o.text
          : o.text !== undefined && o.text !== null
            ? resolveLocalizedText(o.text)
            : "";
      const label = textFromJson.trim() || resolveItemValueLabel(iv).trim();
      const val =
        o.value !== undefined && o.value !== null ? o.value : iv.value;
      return { value: val, text: label || String(val ?? "") };
    }

    const itemLabel = resolveItemValueLabel(iv).trim();
    return {
      value: iv.value,
      text: itemLabel || String(iv.value ?? ""),
    };
  });
}
