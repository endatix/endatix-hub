import { ItemValue, Question } from 'survey-core';
import type { DataListChoiceItem } from '@/lib/endatix-api/data-lists/types';
import { DATA_LIST_PROPERTY_NAME } from '../constants';

export const DATA_LIST_ITEM_MAX_LENGTH = 255;
export const DATA_LIST_NAME_MAX_LENGTH = 100;

export interface ConvertibleChoiceQuestionRef {
  name: string;
  type: 'dropdown' | 'tagbox';
  choiceCount: number;
  title: string;
}

export type NormalizeChoicesResult =
  | { ok: true; items: DataListChoiceItem[] }
  | { ok: false; error: string };

export function resolveLocalizedText(title: unknown): string {
  if (typeof title === 'string') {
    return title.trim();
  }
  if (title && typeof title === 'object' && !Array.isArray(title)) {
    const o = title as Record<string, unknown>;
    const preferred =
      o.default ??
      o.en ??
      Object.values(o).find((v) => typeof v === 'string');
    if (typeof preferred === 'string') {
      return preferred.trim();
    }
  }
  return '';
}

function toPlainText(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    // Decode ampersand last to avoid double-unescaping sequences like &amp;quot;.
    .replace(/&amp;/gi, '&')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readQuestionProp(q: Question, name: string): unknown {
  const viaSerializer = q.getPropertyValue(name);
  if (viaSerializer !== undefined && viaSerializer !== null) {
    return viaSerializer;
  }
  const direct = (q as unknown as Record<string, unknown>)[name];
  if (direct !== undefined && direct !== null) {
    return direct;
  }
  const json = q.toJSON() as Record<string, unknown>;
  return json[name];
}

export function hasDynamicChoiceSources(q: Question): boolean {
  const dataListId = readQuestionProp(q, DATA_LIST_PROPERTY_NAME);
  if (
    dataListId !== undefined &&
    dataListId !== null &&
    String(dataListId).length > 0
  ) {
    return true;
  }
  const cfq = readQuestionProp(q, 'choicesFromQuestion');
  if (cfq !== undefined && cfq !== null && String(cfq).trim().length > 0) {
    return true;
  }
  const cbu = readQuestionProp(q, 'choicesByUrl');
  if (typeof cbu === 'string' && cbu.trim().length > 0) {
    return true;
  }
  if (cbu && typeof cbu === 'object') {
    const url = (cbu as { url?: unknown }).url;
    if (typeof url === 'string' && url.trim().length > 0) {
      return true;
    }
  }
  return false;
}

export function getPlainChoiceValuesForNormalization(q: Question): unknown[] {
  return q.choices.map((iv: ItemValue) => {
    const anyIv = iv as { toJSON?: () => unknown };
    const json = typeof anyIv.toJSON === 'function' ? anyIv.toJSON() : null;
    if (json && typeof json === 'object') {
      const o = json as Record<string, unknown>;
      const textFromJson =
        typeof o.text === 'string'
          ? o.text
          : o.text !== undefined && o.text !== null
            ? resolveLocalizedText(o.text)
            : '';
      const textFromItem =
        typeof iv.text === 'string'
          ? iv.text
          : iv.text !== undefined && iv.text !== null
            ? resolveLocalizedText(iv.text as unknown)
            : '';
      const label = textFromJson.trim() || textFromItem.trim();
      const val = o.value !== undefined && o.value !== null ? o.value : iv.value;
      return { value: val, text: label || String(val ?? '') };
    }
    const itemLabel =
      typeof iv.text === 'string'
        ? iv.text
        : iv.text !== undefined && iv.text !== null
          ? resolveLocalizedText(iv.text as unknown)
          : '';
    return {
      value: iv.value,
      text: itemLabel.trim() || String(iv.value ?? ''),
    };
  });
}

export function isInlineChoicesQuestion(q: Question): boolean {
  const t = q.getType();
  if (t !== 'dropdown' && t !== 'tagbox') {
    return false;
  }
  if (hasDynamicChoiceSources(q)) {
    return false;
  }
  return q.choices.length > 0;
}

export function normalizeChoicesToDataListItems(
  choices: unknown,
): NormalizeChoicesResult {
  if (!Array.isArray(choices) || choices.length === 0) {
    return { ok: false, error: 'No choices to convert.' };
  }

  const items: DataListChoiceItem[] = [];
  const seenValues = new Set<string>();

  for (let i = 0; i < choices.length; i++) {
    const raw = choices[i];
    let label: string;
    let value: string;

    if (typeof raw === 'string') {
      label = raw;
      value = raw;
    } else if (raw && typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      let text = '';
      if (typeof o.text === 'string') {
        text = o.text;
      } else if (o.text !== undefined && o.text !== null) {
        text = resolveLocalizedText(o.text);
      } else if (typeof o.html === 'string') {
        text = o.html;
      } else if (o.html !== undefined && o.html !== null) {
        text = resolveLocalizedText(o.html);
      }
      const val =
        o.value !== undefined && o.value !== null ? String(o.value) : '';
      const locDefault =
        o.locText &&
        typeof o.locText === 'object' &&
        (o.locText as { text?: string }).text;
      label =
        text.trim() ||
        (typeof locDefault === 'string' ? locDefault.trim() : '') ||
        val;
      value = val || label;
    } else {
      return {
        ok: false,
        error: `Unsupported choice format at index ${i}.`,
      };
    }

    if (!label.trim() || !value.trim()) {
      return {
        ok: false,
        error: `Choice at index ${i} is missing a label or value.`,
      };
    }

    if (label.length > DATA_LIST_ITEM_MAX_LENGTH) {
      return {
        ok: false,
        error: `Choice label exceeds ${DATA_LIST_ITEM_MAX_LENGTH} characters (index ${i}).`,
      };
    }
    if (value.length > DATA_LIST_ITEM_MAX_LENGTH) {
      return {
        ok: false,
        error: `Choice value exceeds ${DATA_LIST_ITEM_MAX_LENGTH} characters (index ${i}).`,
      };
    }

    const key = value;
    if (seenValues.has(key)) {
      return {
        ok: false,
        error: `Duplicate choice value: ${value}`,
      };
    }
    seenValues.add(key);

    items.push({ label, value });
  }

  return { ok: true, items };
}

export function getQuestionDataListName(
  question: { title?: unknown; name: string },
  existingNames: Set<string>,
): string {
  const fromTitle = toPlainText(resolveLocalizedText(question.title));
  const fromName = toPlainText(question.name || '');
  const baseSource =
    fromTitle ||
    (fromName.length > 0
      ? fromName
      : 'Data list');
  const sanitized = baseSource
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, DATA_LIST_NAME_MAX_LENGTH);
  const base = sanitized.length > 0 ? sanitized : 'Data list';

  let candidate = base;
  let n = 2;
  while (existingNames.has(candidate.toLowerCase())) {
    const suffix = ` (${n})`;
    const maxBaseLength = Math.max(1, DATA_LIST_NAME_MAX_LENGTH - suffix.length);
    const trimmedBase = base.slice(0, maxBaseLength).trim();
    const normalizedBase = trimmedBase.length > 0 ? trimmedBase : 'Data list';
    candidate = `${normalizedBase}${suffix}`;
    n++;
  }
  existingNames.add(candidate.toLowerCase());
  return candidate;
}

export function applyDataListBindingToQuestionJson(
  questionJson: Record<string, unknown>,
  dataListId: string,
): void {
  questionJson[DATA_LIST_PROPERTY_NAME] = dataListId;
  questionJson.choices = [];
  questionJson.choicesLazyLoadEnabled = true;
}

/**
 * Walks survey JSON and applies binding to the first question with a matching name.
 */
export function applyDataListBindingByQuestionName(
  surveyJson: Record<string, unknown>,
  questionName: string,
  dataListId: string,
): boolean {
  const walk = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') {
      return false;
    }
    if (Array.isArray(node)) {
      return node.some((item) => walk(item));
    }
    const o = node as Record<string, unknown>;
    if (
      typeof o.name === 'string' &&
      o.name === questionName &&
      (o.type === 'dropdown' || o.type === 'tagbox')
    ) {
      applyDataListBindingToQuestionJson(o, dataListId);
      return true;
    }
    if (Array.isArray(o.elements)) {
      return o.elements.some((el) => walk(el));
    }
    if (Array.isArray(o.rows)) {
      return o.rows.some((row) => walk(row));
    }
    if (Array.isArray(o.columns)) {
      return o.columns.some((col) => walk(col));
    }
    if (o.templateElements && Array.isArray(o.templateElements)) {
      return o.templateElements.some((el: unknown) => walk(el));
    }
    return false;
  };

  if (Array.isArray(surveyJson.pages)) {
    return surveyJson.pages.some((p) => walk(p));
  }
  if (Array.isArray(surveyJson.elements)) {
    return surveyJson.elements.some((el) => walk(el));
  }
  return walk(surveyJson);
}

function hasPlainDynamicChoiceSources(el: Record<string, unknown>): boolean {
  const dataListId = el[DATA_LIST_PROPERTY_NAME];
  if (
    dataListId !== undefined &&
    dataListId !== null &&
    String(dataListId).length > 0
  ) {
    return true;
  }
  const cfq = el.choicesFromQuestion;
  if (cfq !== undefined && cfq !== null && String(cfq).trim().length > 0) {
    return true;
  }
  const cbu = el.choicesByUrl;
  if (typeof cbu === 'string' && cbu.trim().length > 0) {
    return true;
  }
  if (cbu && typeof cbu === 'object') {
    const url = (cbu as { url?: unknown }).url;
    if (typeof url === 'string' && url.trim().length > 0) {
      return true;
    }
  }
  return false;
}

function inlineChoiceCount(el: Record<string, unknown>): number {
  const choices = el.choices;
  return Array.isArray(choices) ? choices.length : 0;
}

function walkChoiceQuestions(
  node: unknown,
  out: ConvertibleChoiceQuestionRef[],
  threshold: number | undefined,
): void {
  if (!node || typeof node !== 'object') {
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      walkChoiceQuestions(item, out, threshold);
    }
    return;
  }
  const o = node as Record<string, unknown>;
  const qType = o.type;
  if (
    (qType === 'dropdown' || qType === 'tagbox') &&
    typeof o.name === 'string'
  ) {
    if (!hasPlainDynamicChoiceSources(o)) {
      const count = inlineChoiceCount(o);
      if (count > 0) {
        if (threshold === undefined || count >= threshold) {
          out.push({
            name: o.name,
            type: qType,
            choiceCount: count,
            title:
              resolveLocalizedText(o.title) ||
              o.name ||
              qType,
          });
        }
      }
    }
  }
  if (Array.isArray(o.elements)) {
    walkChoiceQuestions(o.elements, out, threshold);
  }
  if (Array.isArray(o.rows)) {
    walkChoiceQuestions(o.rows, out, threshold);
  }
  if (Array.isArray(o.columns)) {
    walkChoiceQuestions(o.columns, out, threshold);
  }
  if (Array.isArray(o.templateElements)) {
    walkChoiceQuestions(o.templateElements, out, threshold);
  }
}

export function findConvertibleChoiceQuestions(
  json: string | object,
  threshold?: number,
): ConvertibleChoiceQuestionRef[] {
  let surveyJson: Record<string, unknown>;
  try {
    surveyJson =
      typeof json === 'string'
        ? (JSON.parse(json) as Record<string, unknown>)
        : (json as Record<string, unknown>);
  } catch {
    return [];
  }

  const out: ConvertibleChoiceQuestionRef[] = [];

  if (Array.isArray(surveyJson.pages)) {
    walkChoiceQuestions(surveyJson.pages, out, threshold);
  } else if (Array.isArray(surveyJson.elements)) {
    walkChoiceQuestions(surveyJson.elements, out, threshold);
  } else {
    walkChoiceQuestions(surveyJson, out, threshold);
  }

  return out;
}
