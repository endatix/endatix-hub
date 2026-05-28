import { describe, expect, it } from "vitest";
import { Model, Question } from "survey-core";
import {
  DATA_LIST_ITEM_MAX_LENGTH,
  DATA_LIST_NAME_MAX_LENGTH,
  DATA_LIST_PROPERTY_NAME,
} from "../../constants";
import {
  applyDataListBindingByQuestionName,
  applyDataListBindingToQuestionJson,
  getQuestionDataListName,
  normalizeChoicesToDataListItems,
  normalizeQuestionChoicesToDataListItems,
  resolveLocalizedText,
} from "../index";
import { isInlineChoicesQuestion } from "../../conversion/inline-choice-conversion";

describe("data-list utils", () => {
  describe("resolveLocalizedText", () => {
    it("returns plain string titles", () => {
      expect(resolveLocalizedText(" Hello ")).toBe("Hello");
    });

    it("falls back to default locale in object titles", () => {
      expect(resolveLocalizedText({ default: "X", en: "Y" })).toBe("X");
    });
  });

  describe("normalizeChoicesToDataListItems", () => {
    it("normalizes string choices", () => {
      const r = normalizeChoicesToDataListItems(["a", "b"]);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.items).toEqual([
          { label: "a", value: "a" },
          { label: "b", value: "b" },
        ]);
      }
    });

    it("normalizes object choices with value and text", () => {
      const r = normalizeChoicesToDataListItems([
        { value: "v1", text: "One" },
        { value: "v2", text: "Two" },
      ]);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.items).toEqual([
          { label: "One", value: "v1" },
          { label: "Two", value: "v2" },
        ]);
      }
    });

    it("resolves localized object text to default locale label", () => {
      const r = normalizeChoicesToDataListItems([
        { value: "bg", text: { default: "Bulgaria", en: "Bulgaria" } },
      ]);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.items).toEqual([{ label: "Bulgaria", value: "bg" }]);
      }
    });

    it("coerces numeric choice values to strings", () => {
      const r = normalizeChoicesToDataListItems([{ value: 42, text: "Forty-two" }]);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.items).toEqual([{ label: "Forty-two", value: "42" }]);
      }
    });

    it("resolves localized object values without object stringification", () => {
      const r = normalizeChoicesToDataListItems([
        { value: { default: "bg", en: "bg" }, text: "Bulgaria" },
      ]);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.items).toEqual([{ label: "Bulgaria", value: "bg" }]);
      }
    });

    it("falls back to label when value is a non-localized object", () => {
      const r = normalizeChoicesToDataListItems([
        { value: { nested: true }, text: "Label only" },
      ]);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.items).toEqual([{ label: "Label only", value: "Label only" }]);
      }
    });

    it("rejects duplicate values", () => {
      const r = normalizeChoicesToDataListItems([
        { value: "x", text: "A" },
        { value: "x", text: "B" },
      ]);
      expect(r.ok).toBe(false);
    });

    it("rejects labels longer than max", () => {
      const long = "x".repeat(DATA_LIST_ITEM_MAX_LENGTH + 1);
      const r = normalizeChoicesToDataListItems([{ value: "v", text: long }]);
      expect(r.ok).toBe(false);
    });
  });

  describe("getQuestionDataListName", () => {
    it("suffixes duplicate names case-insensitively", () => {
      const set = new Set<string>(["foo"]);
      expect(getQuestionDataListName({ name: "q1", title: "Foo" }, set)).toBe(
        "Foo (2)",
      );
    });

    it("uses question name when title missing", () => {
      const set = new Set<string>();
      expect(
        getQuestionDataListName({ name: "my_question", title: "" }, set),
      ).toBe("my_question");
    });

    it("uses question name when title is a generic Survey type label", () => {
      const set = new Set<string>();
      expect(
        getQuestionDataListName(
          { name: "games", title: "Dropdown", type: "dropdown" },
          set,
        ),
      ).toBe("games");
    });

    it("uses question name when title is a numbered generic Survey type label", () => {
      const set = new Set<string>();
      expect(
        getQuestionDataListName(
          { name: "games", title: "Dropdown (3)", type: "dropdown" },
          set,
        ),
      ).toBe("games");
    });

    it("strips html from localized title before naming", () => {
      const set = new Set<string>();
      expect(
        getQuestionDataListName(
          {
            name: "pChannel_Presencial",
            title: {
              es: "<p><strong>Escriba</strong> en la LUPA</p>",
            },
          },
          set,
        ),
      ).toBe("Escriba en la LUPA");
    });

    it("limits generated names to API max length", () => {
      const set = new Set<string>();
      const longTitle = "x".repeat(DATA_LIST_NAME_MAX_LENGTH + 25);
      const name = getQuestionDataListName(
        { name: "q1", title: longTitle },
        set,
      );
      expect(name).toHaveLength(DATA_LIST_NAME_MAX_LENGTH);
    });

    it("keeps duplicate suffix under API max length", () => {
      const max = "x".repeat(DATA_LIST_NAME_MAX_LENGTH);
      const set = new Set<string>([max.toLowerCase()]);
      const name = getQuestionDataListName({ name: "q1", title: max }, set);
      expect(name).toBe(`${"x".repeat(DATA_LIST_NAME_MAX_LENGTH - 4)} (2)`);
      expect(name).toHaveLength(DATA_LIST_NAME_MAX_LENGTH);
    });
  });

  describe("applyDataListBindingToQuestionJson", () => {
    it("sets data list id and clears choices", () => {
      const q: Record<string, unknown> = {
        type: "dropdown",
        name: "q1",
        choices: ["a"],
      };
      applyDataListBindingToQuestionJson(q, "dl-1");
      expect(q[DATA_LIST_PROPERTY_NAME]).toBe("dl-1");
      expect(q.choices).toEqual([]);
      expect(q.choicesLazyLoadEnabled).toBe(true);
    });
  });

  describe("applyDataListBindingByQuestionName", () => {
    it("finds nested question by name", () => {
      const survey: Record<string, unknown> = {
        pages: [
          {
            elements: [
              {
                type: "panel",
                name: "p1",
                elements: [
                  {
                    type: "dropdown",
                    name: "inner",
                    choices: ["x"],
                  },
                ],
              },
            ],
          },
        ],
      };
      const ok = applyDataListBindingByQuestionName(survey, "inner", "id1");
      expect(ok).toBe(true);
      const page = (survey.pages as unknown[])[0] as Record<string, unknown>;
      const panel = (page.elements as unknown[])[0] as Record<string, unknown>;
      const dd = (panel.elements as unknown[])[0] as Record<string, unknown>;
      expect(dd[DATA_LIST_PROPERTY_NAME]).toBe("id1");
    });
  });

  describe("normalizeQuestionChoicesToDataListItems", () => {
    it("normalizes choices from a live dropdown question", () => {
      const m = new Model({
        elements: [
          {
            type: "dropdown",
            name: "q",
            choices: [
              { value: "v1", text: "One" },
              { value: "v2", text: "Two" },
            ],
          },
        ],
      });
      const q = m.getQuestionByName("q") as Question;
      const r = normalizeQuestionChoicesToDataListItems(q);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.items).toEqual([
          { label: "One", value: "v1" },
          { label: "Two", value: "v2" },
        ]);
      }
      m.dispose?.();
    });
  });

  describe("isInlineChoicesQuestion via Model", () => {
    it("treats plain dropdown as convertible", () => {
      const json = {
        pages: [
          { elements: [{ type: "dropdown", name: "q", choices: ["a"] }] },
        ],
      };
      const m = new Model(json as object);
      const q = m.getQuestionByName("q") as Question;
      expect(q.getType()).toBe("dropdown");
      expect(isInlineChoicesQuestion(q)).toBe(true);
      m.dispose?.();
    });
  });
});
