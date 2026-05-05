import { describe, expect, it } from 'vitest';
import { Model, Question } from 'survey-core';
import {
  DATA_LIST_ITEM_MAX_LENGTH,
  applyDataListBindingByQuestionName,
  applyDataListBindingToQuestionJson,
  findConvertibleChoiceQuestions,
  getQuestionDataListName,
  normalizeChoicesToDataListItems,
  resolveLocalizedText,
} from '../choice-conversion.utils';
import { DATA_LIST_PROPERTY_NAME } from '../../constants';

describe('choice-conversion.utils', () => {
  describe('resolveLocalizedText', () => {
    it('returns plain string titles', () => {
      expect(resolveLocalizedText(' Hello ')).toBe('Hello');
    });

    it('falls back to default locale in object titles', () => {
      expect(resolveLocalizedText({ default: 'X', en: 'Y' })).toBe('X');
    });
  });

  describe('normalizeChoicesToDataListItems', () => {
    it('normalizes string choices', () => {
      const r = normalizeChoicesToDataListItems(['a', 'b']);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.items).toEqual([
          { label: 'a', value: 'a' },
          { label: 'b', value: 'b' },
        ]);
      }
    });

    it('normalizes object choices with value and text', () => {
      const r = normalizeChoicesToDataListItems([
        { value: 'v1', text: 'One' },
        { value: 'v2', text: 'Two' },
      ]);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.items).toEqual([
          { label: 'One', value: 'v1' },
          { label: 'Two', value: 'v2' },
        ]);
      }
    });

    it('resolves localized object text to default locale label', () => {
      const r = normalizeChoicesToDataListItems([
        { value: 'bg', text: { default: 'Bulgaria', en: 'Bulgaria' } },
      ]);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.items).toEqual([{ label: 'Bulgaria', value: 'bg' }]);
      }
    });

    it('rejects duplicate values', () => {
      const r = normalizeChoicesToDataListItems([
        { value: 'x', text: 'A' },
        { value: 'x', text: 'B' },
      ]);
      expect(r.ok).toBe(false);
    });

    it('rejects labels longer than max', () => {
      const long = 'x'.repeat(DATA_LIST_ITEM_MAX_LENGTH + 1);
      const r = normalizeChoicesToDataListItems([{ value: 'v', text: long }]);
      expect(r.ok).toBe(false);
    });
  });

  describe('getQuestionDataListName', () => {
    it('suffixes duplicate names case-insensitively', () => {
      const set = new Set<string>(['foo']);
      expect(
        getQuestionDataListName({ name: 'q1', title: 'Foo' }, set),
      ).toBe('Foo (2)');
    });

    it('uses question name when title missing', () => {
      const set = new Set<string>();
      expect(getQuestionDataListName({ name: 'my_question', title: '' }, set)).toBe(
        'my_question',
      );
    });
  });

  describe('findConvertibleChoiceQuestions', () => {
    it('detects dropdown and tagbox with inline choices', () => {
      const json = {
        pages: [
          {
            elements: [
              {
                type: 'dropdown',
                name: 'q1',
                choices: ['a', 'b'],
              },
              {
                type: 'tagbox',
                name: 'q2',
                choices: [{ value: '1', text: 'One' }],
              },
            ],
          },
        ],
      };
      const found = findConvertibleChoiceQuestions(json);
      expect(found.map((f) => f.name).sort()).toEqual(['q1', 'q2']);
    });

    it('skips edxDataListId', () => {
      const json = {
        pages: [
          {
            elements: [
              {
                type: 'dropdown',
                name: 'q1',
                choices: ['a'],
                [DATA_LIST_PROPERTY_NAME]: 'list-1',
              },
            ],
          },
        ],
      };
      expect(findConvertibleChoiceQuestions(json)).toHaveLength(0);
    });

    it('skips choicesByUrl', () => {
      const json = {
        pages: [
          {
            elements: [
              {
                type: 'dropdown',
                name: 'q1',
                choices: ['a'],
                choicesByUrl: 'https://example.com',
              },
            ],
          },
        ],
      };
      expect(findConvertibleChoiceQuestions(json)).toHaveLength(0);
    });

    it('skips choicesFromQuestion', () => {
      const json = {
        pages: [
          {
            elements: [
              {
                type: 'dropdown',
                name: 'q1',
                choices: ['a'],
                choicesFromQuestion: 'q0',
              },
            ],
          },
        ],
      };
      expect(findConvertibleChoiceQuestions(json)).toHaveLength(0);
    });

    it('applies threshold', () => {
      const json = {
        pages: [
          {
            elements: [
              {
                type: 'dropdown',
                name: 'q1',
                choices: Array.from({ length: 9 }, (_, i) => `c${i}`),
              },
            ],
          },
        ],
      };
      expect(findConvertibleChoiceQuestions(json, 10)).toHaveLength(0);
      expect(findConvertibleChoiceQuestions(json, 9)).toHaveLength(1);
    });
  });

  describe('applyDataListBindingToQuestionJson', () => {
    it('sets data list id and clears choices', () => {
      const q: Record<string, unknown> = {
        type: 'dropdown',
        name: 'q1',
        choices: ['a'],
      };
      applyDataListBindingToQuestionJson(q, 'dl-1');
      expect(q[DATA_LIST_PROPERTY_NAME]).toBe('dl-1');
      expect(q.choices).toEqual([]);
      expect(q.choicesLazyLoadEnabled).toBe(true);
    });
  });

  describe('applyDataListBindingByQuestionName', () => {
    it('finds nested question by name', () => {
      const survey: Record<string, unknown> = {
        pages: [
          {
            elements: [
              {
                type: 'panel',
                name: 'p1',
                elements: [
                  {
                    type: 'dropdown',
                    name: 'inner',
                    choices: ['x'],
                  },
                ],
              },
            ],
          },
        ],
      };
      const ok = applyDataListBindingByQuestionName(survey, 'inner', 'id1');
      expect(ok).toBe(true);
      const page = (survey.pages as unknown[])[0] as Record<string, unknown>;
      const panel = (page.elements as unknown[])[0] as Record<string, unknown>;
      const dd = (panel.elements as unknown[])[0] as Record<string, unknown>;
      expect(dd[DATA_LIST_PROPERTY_NAME]).toBe('id1');
    });
  });

  describe('hasDynamicChoiceSources via Model', () => {
    it('treats plain dropdown as convertible', () => {
      const json = {
        pages: [{ elements: [{ type: 'dropdown', name: 'q', choices: ['a'] }] }],
      };
      const m = new Model(json as object);
      const q = m.getQuestionByName('q') as Question;
      expect(q.getType()).toBe('dropdown');
      m.dispose?.();
    });
  });
});
