import { ItemValue, Question } from "survey-core";
import type { DataListChoiceItem } from "@/lib/endatix-api/data-lists/types";
import { parseScalarString } from "@/lib/utils/type-parsers";
import { DATA_LIST_ITEM_MAX_LENGTH } from "../constants";
import { resolveLocalizedText } from "./survey-localized-text";

export type NormalizeChoicesResult =
  | { ok: true; items: DataListChoiceItem[] }
  | { ok: false; error: string };

function resolveChoiceTextFromRecord(o: Record<string, unknown>): string {
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

  const locDefault =
    o.locText &&
    typeof o.locText === "object" &&
    (o.locText as { text?: string }).text;

  return (
    text.trim() || (typeof locDefault === "string" ? locDefault.trim() : "")
  );
}

function resolveChoiceScalarValue(value: unknown): string {
  return (
    parseScalarString(value) ?? resolveLocalizedText(value) ?? ""
  );
}

function resolveLabelAndValueFromRaw(
  raw: unknown,
): { label: string; value: string } | null {
  if (typeof raw === "string") {
    return { label: raw, value: raw };
  }

  if (!raw || typeof raw !== "object") {
    return null;
  }

  const o = raw as Record<string, unknown>;
  const labelText = resolveChoiceTextFromRecord(o);
  const val = resolveChoiceScalarValue(o.value);
  const label = labelText || val;
  const value = val || label;
  return { label, value };
}

function extractLabelAndValueFromChoice(
  raw: unknown,
  index: number,
): { ok: true; label: string; value: string } | { ok: false; error: string } {
  const resolved = resolveLabelAndValueFromRaw(raw);
  if (!resolved) {
    return {
      ok: false,
      error: `Unsupported choice format at index ${index}.`,
    };
  }

  const { label, value } = resolved;
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

/**
 * Reads plain choice label/value pairs from a Survey question for data list import.
 */
export function getPlainChoiceValuesForNormalization(q: Question): unknown[] {
  return q.choices.map((iv: ItemValue) => {
    const json =
      typeof iv.toJSON === "function"
        ? (iv.toJSON() as Record<string, unknown>)
        : null;
    const text =
      (json ? resolveChoiceTextFromRecord(json) : "").trim() ||
      iv.calculatedText.trim();
    const val =
      json && json.value !== undefined && json.value !== null
        ? json.value
        : iv.value;

    return { value: val, text: text || resolveChoiceScalarValue(val) };
  });
}

/**
 * Normalizes a live Survey question's inline choices to API data list items.
 */
export function normalizeQuestionChoicesToDataListItems(
  question: Question,
): NormalizeChoicesResult {
  return normalizeChoicesToDataListItems(
    getPlainChoiceValuesForNormalization(question),
  );
}
