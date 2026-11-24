import type { ItemValue, Question, QuestionMatrixModel } from "survey-core";
import { pdfPlainText } from "@/lib/utils/pdf-plain-text";

function containsWholeCode(label: string, code: string): boolean {
  // Only whitespace separates identifiers; punctuation may belong to the code.
  for (const { index } of label.matchAll(/\S+/gu)) {
    if (
      label.startsWith(code, index) &&
      !/\S/u.test(label.charAt(index + code.length))
    ) {
      return true;
    }
  }
  return false;
}

function labelDisplaysCode(label: string, code: string): boolean {
  if (label.includes(`(${code})`)) return true;
  if (/^[A-Z]{2,}$/.test(code) && label === `${code}s`) return true;

  // A separate sign or range marker can change a number's meaning ("− 1").
  if (/^[+\-−]?\p{N}/u.test(code)) {
    const words = label.split(/\s+/u);
    if (words.some((word) => word !== code && !/^[\p{L}\p{M}]+$/u.test(word)))
      return false;
  }
  return containsWholeCode(label, code);
}

/** Print the stored code alongside its label unless the reader can already see it. */
export function formatChoiceDisplay(
  value: string | number | boolean | null | undefined,
  label?: string | null,
): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const valueStr = pdfPlainText(value);
  const labelStr = pdfPlainText(label?.trim());
  if (!labelStr) return valueStr;
  if (
    !valueStr ||
    labelStr === valueStr ||
    labelDisplaysCode(labelStr, valueStr)
  )
    return labelStr;
  return `${labelStr} (${valueStr})`;
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
