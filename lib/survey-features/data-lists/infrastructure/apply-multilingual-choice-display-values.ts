import type { ItemValue, Question } from "survey-core";
import { parseScalarString } from "@/lib/utils/type-parsers";
import { resolvePublicChoiceLabel } from "../use-cases/search-data-lists/map-public-choice";

type SelectBaseQuestion = Question & {
  value?: unknown;
  createItemValue?: (value: unknown, text?: string) => ItemValue;
  selectedItemValues?: ItemValue | ItemValue[] | null;
  updateChoicesDependedQuestions?: () => void;
};

export type FetchChoiceLabels = (
  values: string[],
) => Promise<Map<string, Record<string, string>>>;

/** Caps follow-up fetches for SurveyJS partial-request / mid-select races. */
const MAX_MISSING_LABEL_FETCH_PASSES = 2;

/**
 * Monotonic generation per question so an older in-flight completion cannot
 * overwrite a newer one after `await fetchLabels`.
 */
const displayCompletionGenerations = new WeakMap<Question, number>();

function beginDisplayCompletion(question: Question): number {
  const next = (displayCompletionGenerations.get(question) ?? 0) + 1;
  displayCompletionGenerations.set(question, next);
  return next;
}

function isCurrentDisplayCompletion(
  question: Question,
  generation: number,
): boolean {
  return displayCompletionGenerations.get(question) === generation;
}

export type ApplyMultilingualChoiceDisplayOptions = {
  /** When false, skips SurveyJS depended-question notification (default true). */
  notifyDependents?: boolean;
};

/**
 * Applies multilingual choice labels to SurveyJS selected items.
 *
 * `onGetChoiceDisplayValue` only accepts flat strings, which SurveyJS stores
 * under the *current* locale. After setItems, stamp the full catalog label map
 * onto `locText` so SurveyJS switches languages natively — same shape as
 * lazy-load choice `text` maps (`default` + cultures).
 *
 * Then optionally notify SurveyJS depended questions (e.g. carry-forward
 * targets). Value-change sync often runs before display values resolve, so
 * dependents would otherwise keep ID-only fallback choices.
 */
export function applyMultilingualChoiceDisplayValues(
  question: Question,
  values: string[],
  labelsByValue: Map<string, Record<string, string>>,
  setItems: (displayValues: string[]) => void,
  activeLocale?: string,
  options?: ApplyMultilingualChoiceDisplayOptions,
): void {
  const flatLabels = values.map((value) =>
    resolvePublicChoiceLabel(
      { value, labels: labelsByValue.get(value) ?? { default: value } },
      activeLocale,
    ),
  );

  setItems(flatLabels);
  writeSelectedItemLocaleMaps(question, values, labelsByValue);

  if (options?.notifyDependents !== false) {
    notifyChoicesDependedQuestions(question);
  }
}

/**
 * Completes lazy-load display resolution for the *current* selection.
 *
 * SurveyJS `updateSelectedItemValues` captures `value` when the request starts
 * and ignores later calls while waiting. Fast multi-select therefore often
 * applies labels for a partial value array. This reconciles against
 * `question.value` after setItems, fetches any still-missing labels, writes a
 * full `selectedItemValues` set, and notifies depended questions once.
 */
export async function completeLazyLoadChoiceDisplayValues(options: {
  question: Question;
  requestedValues: string[];
  labelsByValue: Map<string, Record<string, string>>;
  setItems: (displayValues: string[]) => void;
  activeLocale?: string;
  fetchLabels: FetchChoiceLabels;
}): Promise<void> {
  const { question, requestedValues, setItems, activeLocale, fetchLabels } =
    options;

  const generation = beginDisplayCompletion(question);
  const labelsByValue = new Map(options.labelsByValue);

  // Partial apply without notifying — dependents should see the reconciled set.
  applyMultilingualChoiceDisplayValues(
    question,
    requestedValues,
    labelsByValue,
    setItems,
    activeLocale,
    { notifyDependents: false },
  );

  const currentValues = await reconcileMissingLabels({
    question,
    labelsByValue,
    fetchLabels,
    generation,
  });

  if (
    currentValues === null ||
    !isCurrentDisplayCompletion(question, generation)
  ) {
    return;
  }

  writeCompleteSelectedItemValues(
    question,
    currentValues,
    labelsByValue,
    activeLocale,
  );
  notifyChoicesDependedQuestions(question);
}

async function reconcileMissingLabels(options: {
  question: Question;
  labelsByValue: Map<string, Record<string, string>>;
  fetchLabels: FetchChoiceLabels;
  generation: number;
}): Promise<string[] | null> {
  const { question, labelsByValue, fetchLabels, generation } = options;

  let currentValues = getSelectedValueStrings(question);

  for (let pass = 0; pass < MAX_MISSING_LABEL_FETCH_PASSES; pass++) {
    const missingValues = currentValues.filter(
      (value) => !labelsByValue.has(value),
    );
    if (missingValues.length === 0) {
      return currentValues;
    }

    const fetched = await fetchLabels(missingValues);
    if (!isCurrentDisplayCompletion(question, generation)) {
      return null;
    }

    for (const [value, labels] of fetched) {
      labelsByValue.set(value, labels);
    }

    currentValues = getSelectedValueStrings(question);
  }

  return currentValues;
}

function notifyChoicesDependedQuestions(question: Question): void {
  const host = question as SelectBaseQuestion;
  if (typeof host.updateChoicesDependedQuestions === "function") {
    host.updateChoicesDependedQuestions();
  }
}

function getSelectedValueStrings(question: Question): string[] {
  const value = (question as SelectBaseQuestion).value;
  if (value == null || value === "") {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  const result: string[] = [];
  const seen = new Set<string>();

  for (const entry of values) {
    const key = parseScalarString(entry) ?? String(entry);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(key);
  }

  return result;
}

function writeCompleteSelectedItemValues(
  question: Question,
  values: string[],
  labelsByValue: Map<string, Record<string, string>>,
  activeLocale?: string,
): void {
  const host = question as SelectBaseQuestion;
  if (typeof host.createItemValue !== "function" || values.length === 0) {
    writeSelectedItemLocaleMaps(question, values, labelsByValue);
    return;
  }

  const items = values.map((value) => {
    const labels = labelsByValue.get(value) ?? { default: value };
    const item = host.createItemValue!(
      value,
      resolvePublicChoiceLabel({ value, labels }, activeLocale),
    );
    item.locText?.setJson?.(labels);
    return item;
  });

  host.selectedItemValues = Array.isArray(host.value) ? items : items[0];
}

function writeSelectedItemLocaleMaps(
  question: Question,
  values: string[],
  labelsByValue: Map<string, Record<string, string>>,
): void {
  const selected = (question as SelectBaseQuestion).selectedItemValues;
  let items: ItemValue[] = [];
  if (Array.isArray(selected)) {
    items = selected;
  } else if (selected) {
    items = [selected];
  }

  const valueFilter = values.length > 0 ? new Set(values) : null;

  for (const item of items) {
    const valueKey = parseScalarString(item?.value);
    if (valueKey == null || typeof item.locText?.setJson !== "function") {
      continue;
    }

    if (valueFilter && !valueFilter.has(valueKey)) {
      continue;
    }

    const labels = labelsByValue.get(valueKey);
    if (!labels) {
      continue;
    }

    item.locText.setJson(labels);
  }
}
