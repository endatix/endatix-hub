import type { Question } from "survey-core";
import { parseScalarString } from "@/lib/utils/type-parsers";
import { resolvePublicChoiceLabel } from "../use-cases/search-data-lists/map-public-choice";

type SelectBaseQuestion = Question & {
  selectedItemValues?:
    | { value?: unknown; locText?: { setJson?: (json: unknown) => void } }
    | Array<{
        value?: unknown;
        locText?: { setJson?: (json: unknown) => void };
      }>;
};

/**
 * Applies multilingual choice labels to SurveyJS selected items.
 *
 * `onGetChoiceDisplayValue` only accepts flat strings, which SurveyJS stores
 * under the *current* locale. After setItems, stamp the full catalog label map
 * onto `locText` so SurveyJS switches languages natively — same shape as
 * lazy-load choice `text` maps (`default` + cultures).
 */
export function applyMultilingualChoiceDisplayValues(
  question: Question,
  values: string[],
  labelsByValue: Map<string, Record<string, string>>,
  setItems: (displayValues: string[]) => void,
  activeLocale?: string,
): void {
  const labelsForStamp = new Map<string, Record<string, string>>();
  const flatLabels: string[] = [];

  for (const value of values) {
    const labels = labelsByValue.get(value) ?? { default: value };
    labelsForStamp.set(value, labels);
    flatLabels.push(resolvePublicChoiceLabel({ value, labels }, activeLocale));
  }

  setItems(flatLabels);
  stampSelectedItemLocaleMaps(question, labelsForStamp);
}

function stampSelectedItemLocaleMaps(
  question: Question,
  labelsByValue: Map<string, Record<string, string>>,
): void {
  const selected = (question as SelectBaseQuestion).selectedItemValues;
  let items: Array<{
    value?: unknown;
    locText?: { setJson?: (json: unknown) => void };
  }> = [];
  if (Array.isArray(selected)) {
    items = selected;
  } else if (selected) {
    items = [selected];
  }

  for (const item of items) {
    const valueKey = parseScalarString(item?.value);
    if (valueKey == null || typeof item.locText?.setJson !== "function") {
      continue;
    }

    const labels = labelsByValue.get(valueKey);
    if (!labels) {
      continue;
    }

    item.locText.setJson(labels);
  }
}
