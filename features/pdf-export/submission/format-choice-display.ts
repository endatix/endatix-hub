import type { ItemValue, Question, QuestionMatrixModel } from "survey-core";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";

const WORD_END = /[\p{L}\p{M}\p{N}_]$/u;
const WORD_START = /^[\p{L}\p{M}\p{N}_]/u;

function containsWholeValue(label: string, value: string): boolean {
  for (
    let at = label.indexOf(value);
    at >= 0;
    at = label.indexOf(value, at + 1)
  ) {
    const end = at + value.length;
    // Two UTF-16 units hold the adjacent code point even outside the BMP.
    if (
      !WORD_END.test(label.slice(Math.max(0, at - 2), at)) &&
      !WORD_START.test(label.slice(end, end + 2))
    )
      return true;
  }
  return false;
}

/**
 * Formats a stored choice value with its resolved label for PDF export.
 * When label differs from value (e.g. data lists), shows both: "United States (us)".
 */
export function formatChoiceDisplay(
  value: string | number | boolean | null | undefined,
  label?: string | null,
): string {
  if (value === null || value === undefined || value === "") return "";

  const valueStr = pdfPlainText(value);
  const labelStr = pdfPlainText(label?.trim());
  if (!labelStr) return valueStr;
  if (!valueStr || labelStr === valueStr) return labelStr;

  const pluralAcronym =
    /^[A-Z]{2,}$/.test(valueStr) &&
    containsWholeValue(labelStr, `${valueStr}s`);
  return pluralAcronym || containsWholeValue(labelStr, valueStr)
    ? labelStr
    : `${labelStr} (${valueStr})`;
}

export function resolveItemValueLabel(
  item: ItemValue | undefined,
): string | undefined {
  if (!item) {
    return undefined;
  }

  const text = item.text?.trim();
  if (text) {
    return pdfPlainText(text);
  }

  const title = item.title;
  if (typeof title === "string" && title.trim().length > 0) {
    return pdfPlainText(title.trim());
  }

  return undefined;
}

function resolveDisplayValueLabel(
  question: Question,
  value?: unknown,
): string | undefined {
  const displayValue =
    value === undefined
      ? question.getDisplayValue(false)
      : question.getDisplayValue(false, value);

  if (
    displayValue === null ||
    displayValue === undefined ||
    displayValue === ""
  ) {
    return undefined;
  }

  return pdfPlainText(String(displayValue));
}

/** Resolves display label for choice questions (incl. lazy-load data lists). */
export function resolveChoiceLabelForQuestion(
  question: Question,
): string | undefined {
  const value = question.value;
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const valueStr = String(value);
  const fromDisplay = resolveDisplayValueLabel(question);
  if (fromDisplay && fromDisplay !== valueStr) {
    return fromDisplay;
  }

  const fromChoices = question.choices?.find(
    (choice: ItemValue) => String(choice.value) === valueStr,
  );
  const choiceLabel = resolveItemValueLabel(fromChoices);
  if (choiceLabel) {
    return choiceLabel;
  }

  const questionWithSelectedItem = question as Question & {
    selectedItem?: ItemValue;
  };
  const fromSelected = resolveItemValueLabel(
    questionWithSelectedItem.selectedItem,
  );
  if (fromSelected && fromSelected !== valueStr) {
    return fromSelected;
  }

  return fromSelected;
}

/** Resolves a single choice value label (tagbox, ranking, etc.). */
export function resolveChoiceLabel(
  question: Question,
  value: string | number,
): string | undefined {
  const valueStr = String(value);
  const fromDisplay = resolveDisplayValueLabel(question, value);
  if (fromDisplay && fromDisplay !== valueStr) {
    return fromDisplay;
  }

  const fromChoices = question.choices?.find(
    (choice: ItemValue) => String(choice.value) === valueStr,
  );
  return resolveItemValueLabel(fromChoices);
}

/** Resolves a matrix cell answer from column definitions (not `choices`). */
export function resolveMatrixColumnLabel(
  question: QuestionMatrixModel,
  value: string | number,
): string | undefined {
  const valueStr = String(value);
  const fromDisplay = resolveDisplayValueLabel(question, value);
  if (fromDisplay && fromDisplay !== valueStr) {
    return fromDisplay;
  }

  const column = question.columns?.find(
    (item: ItemValue) => String(item.value) === valueStr,
  );
  return resolveItemValueLabel(column);
}
