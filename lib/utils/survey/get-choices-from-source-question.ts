import type { ItemValue, QuestionSelectBase } from "survey-core";
import {
  SourceSelectionModes,
  type SourceSelectionMode,
} from "@/lib/survey-features/question-loops/types";
import { hasCatalogLabelMap } from "./choice-display";
import { normalizeChoiceKey } from "./choice-values";

type LazySelectSource = QuestionSelectBase & {
  choicesLazyLoadEnabled?: boolean;
  selectedItemValues?: ItemValue | ItemValue[] | null;
};

/**
 * Reads choices from a source question using SurveyJS carry-forward semantics
 * (visibleChoices, isBuiltInChoice, isItemSelected).
 *
 * For lazy-loaded sources in Selected Only mode, also synthesizes ItemValues
 * for selected values that are not in the currently loaded visibleChoices page
 * (SurveyJS overwrites the page and disables customChoices for lazy load), and
 * prefers `selectedItemValues` when those carry resolved display labels (#829).
 */
export function getChoicesFromSourceQuestion(
  source: QuestionSelectBase,
  selectionMode: SourceSelectionMode,
): ItemValue[] {
  if (source.isInDesignMode) {
    return [];
  }

  const res: ItemValue[] = [];
  let isSelected: boolean | undefined;
  if (selectionMode === SourceSelectionModes.SelectedOnly) {
    isSelected = true;
  } else if (selectionMode === SourceSelectionModes.UnselectedOnly) {
    isSelected = false;
  }

  const choices = source.visibleChoices;
  for (let i = 0; i < choices.length; i++) {
    const choice = choices[i];
    if (source.isBuiltInChoice(choice)) {
      continue;
    }

    if (isSelected === undefined) {
      res.push(choice);
      continue;
    }

    const itemsSelected = source.isItemSelected(choice);
    if ((itemsSelected && isSelected) || (!itemsSelected && !isSelected)) {
      res.push(choice);
    }
  }

  enrichLazyLoadSelectedChoices(source, selectionMode, res);

  if (
    selectionMode === SourceSelectionModes.SelectedOnly &&
    !source.showOtherItem &&
    source.isOtherSelected &&
    source.otherValue
  ) {
    res.push(source.createItemValue(source.otherItem.value, source.otherValue));
  }

  return res;
}

/**
 * Selected Only + lazy load: keep off-page selections and prefer labeled
 * `selectedItemValues` over ID-only visibleChoices / synthesize fallbacks.
 * Clones preferred items so carry-forward aggregation does not share live
 * `selectedItemValues` references with the source question.
 */
function enrichLazyLoadSelectedChoices(
  source: QuestionSelectBase,
  selectionMode: SourceSelectionMode,
  res: ItemValue[],
): void {
  if (selectionMode !== SourceSelectionModes.SelectedOnly) {
    return;
  }

  const lazySource = source as LazySelectSource;
  if (!lazySource.choicesLazyLoadEnabled) {
    return;
  }

  const selectedByKey = indexSelectedItemValues(lazySource);
  replaceResultsWithPreferredSelectedItems(source, res, selectedByKey);
  const presentKeys = collectPresentNormalizedKeys(res);
  appendMissingNonBuiltInSelectedValues(
    source,
    res,
    selectedByKey,
    presentKeys,
  );
}

function replaceResultsWithPreferredSelectedItems(
  source: QuestionSelectBase,
  res: ItemValue[],
  selectedByKey: Map<string, ItemValue>,
): void {
  for (let i = 0; i < res.length; i++) {
    const current = res[i]!;
    const key = normalizeChoiceKey(current.value);
    if (!key) {
      continue;
    }

    const preferred = selectedByKey.get(key);
    if (!preferred) {
      continue;
    }

    // Do not regress a catalog-mapped visibleChoices label with identity
    // selectedItemValues (common during lazy-load display races).
    if (hasCatalogLabelMap(current) && !hasCatalogLabelMap(preferred)) {
      continue;
    }

    res[i] = cloneChoiceItem(source, preferred);
  }
}

function collectPresentNormalizedKeys(res: ItemValue[]): Set<string> {
  const presentKeys = new Set<string>();
  for (const item of res) {
    const key = normalizeChoiceKey(item.value);
    if (key) {
      presentKeys.add(key);
    }
  }
  return presentKeys;
}

function appendMissingNonBuiltInSelectedValues(
  source: QuestionSelectBase,
  res: ItemValue[],
  selectedByKey: Map<string, ItemValue>,
  presentKeys: Set<string>,
): void {
  for (const value of getSelectedValues(source)) {
    const key = normalizeChoiceKey(value);
    if (!key || presentKeys.has(key)) {
      continue;
    }

    if (isSourceBuiltInValue(source, value)) {
      continue;
    }

    const preferred = selectedByKey.get(key);
    res.push(
      preferred
        ? cloneChoiceItem(source, preferred)
        : source.createItemValue(value),
    );
    presentKeys.add(key);
  }
}

function cloneChoiceItem(
  source: QuestionSelectBase,
  preferred: ItemValue,
): ItemValue {
  const clone = source.createItemValue(preferred.value, preferred.text);
  const locJson = preferred.locText?.getJson?.();
  if (locJson != null && locJson !== "") {
    clone.locText?.setJson?.(locJson);
  }
  return clone;
}

function indexSelectedItemValues(
  source: LazySelectSource,
): Map<string, ItemValue> {
  const byValue = new Map<string, ItemValue>();
  const selected = source.selectedItemValues;
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

function isSourceBuiltInValue(
  source: QuestionSelectBase,
  value: unknown,
): boolean {
  const key = normalizeChoiceKey(value);
  if (!key) {
    return true;
  }

  const sentinels = [
    source.noneItem,
    source.otherItem,
    source.refuseItem,
    source.dontKnowItem,
  ];

  return sentinels.some(
    (item) => item != null && normalizeChoiceKey(item.value) === key,
  );
}

function getSelectedValues(source: QuestionSelectBase): unknown[] {
  const value = source.value;
  if (value == null || value === "") {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}
