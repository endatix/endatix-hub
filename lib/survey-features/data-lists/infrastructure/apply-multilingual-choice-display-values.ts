import { ItemValue, type Question } from "survey-core";
import { hasCatalogLabelMap, readCatalogLabels } from "@/lib/utils/survey/choice-display";
import { normalizeChoiceKey } from "@/lib/utils/survey/choice-values";
import { parseScalarString } from "@/lib/utils/type-parsers";
import { resolvePublicChoiceLabel } from "../use-cases/search-data-lists/map-public-choice";

type SelectBaseQuestion = Question & {
  value?: unknown;
  choicesLazyLoadEnabled?: boolean;
  createItemValue?: (value: unknown, text?: string) => ItemValue;
  selectedItemValues?: ItemValue | ItemValue[] | null;
  updateChoicesDependedQuestions?: () => void;
};

export type FetchChoiceLabels = (
  values: string[],
) => Promise<Map<string, Record<string, string>>>;

/**
 * Caps follow-up fetches for SurveyJS partial-request / mid-select races.
 * Bound is intentionally small (network chatter) but high enough for fast
 * multi-select; a final fetch still runs after the loop if labels remain missing.
 */
const MAX_MISSING_LABEL_FETCH_PASSES = 4;

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

  let currentValues: string[] | null;
  try {
    currentValues = await reconcileMissingLabels({
      question,
      labelsByValue,
      fetchLabels,
      generation,
    });
  } catch {
    if (!isCurrentDisplayCompletion(question, generation)) {
      return;
    }
    // Keep labels resolved so far and finish against the current selection.
    currentValues = getSelectedValueStrings(question);
  }

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

  // One last attempt after the pass cap so dependents are less likely to be
  // notified with a still-incomplete label map.
  const stillMissing = currentValues.filter(
    (value) => !labelsByValue.has(value),
  );
  if (stillMissing.length === 0) {
    return currentValues;
  }

  const fetched = await fetchLabels(stillMissing);
  if (!isCurrentDisplayCompletion(question, generation)) {
    return null;
  }

  for (const [value, labels] of fetched) {
    labelsByValue.set(value, labels);
  }

  return getSelectedValueStrings(question);
}

function notifyChoicesDependedQuestions(question: Question): void {
  const host = question as SelectBaseQuestion;
  if (typeof host.updateChoicesDependedQuestions === "function") {
    host.updateChoicesDependedQuestions();
  }
}

/**
 * SurveyJS refreshes `choices` LocStrings on locale change, but never
 * `selectedItemValues` for `choicesLazyLoadEnabled` questions. Tagbox chips
 * bind to `selectedItemValues[].locText` via SurveyLocStringViewer, so without
 * this notify they keep the previous locale's DOM until remount/refresh.
 *
 * Label maps are already stamped by {@link applyMultilingualChoiceDisplayValues};
 * this only fires LocString change so the UI can re-read `.text`.
 */
export function notifyLazySelectedItemLocaleStrings(question: Question): void {
  const host = question as SelectBaseQuestion;
  if (host.choicesLazyLoadEnabled !== true) {
    return;
  }

  const items = getSelectedItemValueList(host);
  if (items.length === 0) {
    return;
  }

  ItemValue.locStrsChanged(items);
}

function getSelectedItemValueList(host: SelectBaseQuestion): ItemValue[] {
  const selected = host.selectedItemValues;
  if (Array.isArray(selected)) {
    return selected;
  }
  if (selected) {
    return [selected];
  }
  return [];
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

  const existingByValue = indexSelectedItemsByValue(host.selectedItemValues);

  const items = values.map((value) => {
    const labels = resolveLabelsForWrite(value, labelsByValue, existingByValue);
    const item = host.createItemValue!(
      value,
      resolvePublicChoiceLabel({ value, labels }, activeLocale),
    );
    item.locText?.setJson?.(labels);
    return item;
  });

  host.selectedItemValues = Array.isArray(host.value) ? items : items[0];
}

/**
 * Prefer fetched labels; otherwise keep a previously stamped catalog map on
 * the selected item; last resort is identity `{ default: value }` so SurveyJS /
 * CF can still finish when the display-value API fails.
 */
function resolveLabelsForWrite(
  value: string,
  labelsByValue: Map<string, Record<string, string>>,
  existingByValue: Map<string, ItemValue>,
): Record<string, string> {
  const fetched = labelsByValue.get(value);
  if (fetched) {
    return fetched;
  }

  const existing = existingByValue.get(value);
  if (existing && hasCatalogLabelMap(existing)) {
    return readCatalogLabels(existing);
  }

  return { default: value };
}

function indexSelectedItemsByValue(
  selected: ItemValue | ItemValue[] | null | undefined,
): Map<string, ItemValue> {
  const byValue = new Map<string, ItemValue>();
  let items: ItemValue[] = [];
  if (Array.isArray(selected)) {
    items = selected;
  } else if (selected) {
    items = [selected];
  }

  for (const item of items) {
    const key = normalizeChoiceKey(item?.value);
    if (key) {
      byValue.set(key, item);
    }
  }

  return byValue;
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
