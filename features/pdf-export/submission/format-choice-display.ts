import type { ItemValue, Question, QuestionMatrixModel } from 'survey-core';

/**
 * Formats a stored choice value with its resolved label for PDF export.
 * When label differs from value (e.g. data lists), shows both: "United States (us)".
 */
export function formatChoiceDisplay(
  value: string | number | boolean | null | undefined,
  label?: string | null,
): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const valueStr = String(value);
  const labelStr = label?.trim();
  if (!labelStr || labelStr === valueStr) {
    return valueStr;
  }

  return `${labelStr} (${valueStr})`;
}

export function resolveItemValueLabel(item: ItemValue | undefined): string | undefined {
  if (!item) {
    return undefined;
  }

  const text = item.text?.trim();
  if (text) {
    return text;
  }

  const title = item.title;
  if (typeof title === 'string' && title.trim().length > 0) {
    return title.trim();
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

  if (displayValue === null || displayValue === undefined || displayValue === '') {
    return undefined;
  }

  return String(displayValue);
}

/** Resolves display label for choice questions (incl. lazy-load data lists). */
export function resolveChoiceLabelForQuestion(question: Question): string | undefined {
  const value = question.value;
  if (value === null || value === undefined || value === '') {
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
