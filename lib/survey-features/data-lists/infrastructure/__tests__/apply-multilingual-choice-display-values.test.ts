import { describe, expect, it, vi } from "vitest";
import { Model, QuestionDropdownModel } from "survey-core";
import {
  applyMultilingualChoiceDisplayValues,
  completeLazyLoadChoiceDisplayValues,
  notifyLazySelectedItemLocaleStrings,
} from "../apply-multilingual-choice-display-values";

type SelectedChoiceItem = {
  text: string;
  value?: unknown;
  locText: { getJson: () => Record<string, string> };
};

/** SurveyJS keeps `selectedItemValues` protected; tests need the same access path as production. */
type SelectBaseQuestion = QuestionDropdownModel & {
  selectedItemValues: SelectedChoiceItem[] | SelectedChoiceItem;
  updateChoicesDependedQuestions?: () => void;
};

describe("applyMultilingualChoiceDisplayValues", () => {
  it("passes flat labels to setItems then stamps full locale maps on selected items", () => {
    const model = new Model({
      locale: "bg",
      pages: [
        {
          elements: [
            {
              type: "tagbox",
              name: "cities",
              choicesLazyLoadEnabled: true,
            },
          ],
        },
      ],
    });
    model.locale = "bg";

    const question = model.getQuestionByName("cities") as SelectBaseQuestion;
    const setItems = vi.fn((displayValues: string[]) => {
      question.selectedItemValues = displayValues.map((text, index) =>
        question.createItemValue(["728193", "727011"][index], text),
      ) as SelectedChoiceItem[];
    });

    applyMultilingualChoiceDisplayValues(
      question,
      ["728193", "727011"],
      new Map([
        ["728193", { default: "Plovdiv", bg: "Пловдив" }],
        ["727011", { default: "Sofia", bg: "София" }],
      ]),
      setItems,
      "bg",
    );

    expect(setItems).toHaveBeenCalledWith(["Пловдив", "София"]);

    const selected = question.selectedItemValues as SelectedChoiceItem[];

    expect(selected[0].locText.getJson()).toEqual({
      default: "Plovdiv",
      bg: "Пловдив",
    });
    expect(selected[1].locText.getJson()).toEqual({
      default: "Sofia",
      bg: "София",
    });

    model.locale = "";
    expect(selected.map((item: SelectedChoiceItem) => item.text)).toEqual([
      "Plovdiv",
      "Sofia",
    ]);

    model.locale = "bg";
    expect(selected.map((item: SelectedChoiceItem) => item.text)).toEqual([
      "Пловдив",
      "София",
    ]);
  });

  it("notifies SurveyJS depended questions after stamping labels", () => {
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "tagbox",
              name: "cities",
              choicesLazyLoadEnabled: true,
            },
          ],
        },
      ],
    });
    const question = model.getQuestionByName("cities") as SelectBaseQuestion;
    const updateChoicesDependedQuestions = vi.fn();
    question.updateChoicesDependedQuestions = updateChoicesDependedQuestions;

    const setItems = vi.fn((displayValues: string[]) => {
      question.selectedItemValues = displayValues.map((text, index) =>
        question.createItemValue(["728193"][index], text),
      ) as SelectedChoiceItem[];
    });

    applyMultilingualChoiceDisplayValues(
      question,
      ["728193"],
      new Map([["728193", { default: "Plovdiv", bg: "Пловдив" }]]),
      setItems,
      "bg",
    );

    expect(updateChoicesDependedQuestions).toHaveBeenCalledTimes(1);
  });
});

describe("completeLazyLoadChoiceDisplayValues", () => {
  it("fetches labels for selection values missing from the in-flight request", async () => {
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "tagbox",
              name: "cities",
              choicesLazyLoadEnabled: true,
            },
          ],
        },
      ],
    });
    model.locale = "es";

    const question = model.getQuestionByName("cities") as SelectBaseQuestion;
    // Simulate SurveyJS race: request started with one value, selection grew.
    question.value = ["2510911", "3117735", "2520493"];

    const updateChoicesDependedQuestions = vi.fn();
    question.updateChoicesDependedQuestions = updateChoicesDependedQuestions;

    const setItems = vi.fn((displayValues: string[]) => {
      question.selectedItemValues = displayValues.map((text, index) =>
        question.createItemValue(["2510911"][index], text),
      ) as SelectedChoiceItem[];
    });

    const fetchLabels = vi.fn(async (missing: string[]) => {
      expect(missing).toEqual(["3117735", "2520493"]);
      return new Map([
        ["3117735", { default: "A Coruña", es: "A Coruña" }],
        ["2520493", { default: "'s-Hertogenbosch", es: "'s-Hertogenbosch" }],
      ]);
    });

    await completeLazyLoadChoiceDisplayValues({
      question,
      requestedValues: ["2510911"],
      labelsByValue: new Map([
        ["2510911", { default: "Sevilla", es: "Sevilla" }],
      ]),
      setItems,
      activeLocale: "es",
      fetchLabels,
    });

    expect(fetchLabels).toHaveBeenCalledTimes(1);
    expect(setItems).toHaveBeenCalledWith(["Sevilla"]);
    // Notify once after reconcile — not after the partial setItems apply.
    expect(updateChoicesDependedQuestions).toHaveBeenCalledTimes(1);

    const selected = question.selectedItemValues as SelectedChoiceItem[];
    expect(
      selected.map((item) => ({ value: item.value, text: item.text })),
    ).toEqual([
      { value: "2510911", text: "Sevilla" },
      { value: "3117735", text: "A Coruña" },
      { value: "2520493", text: "'s-Hertogenbosch" },
    ]);
  });

  it("ignores a superseded in-flight completion after a newer one starts", async () => {
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "tagbox",
              name: "cities",
              choicesLazyLoadEnabled: true,
            },
          ],
        },
      ],
    });

    const question = model.getQuestionByName("cities") as SelectBaseQuestion;
    // Force the older completion into an awaited fetch pass.
    question.value = ["2510911", "999"];

    let releaseFetch: (() => void) | undefined;
    const fetchGate = new Promise<void>((resolve) => {
      releaseFetch = resolve;
    });

    const setItemsOlder = vi.fn((displayValues: string[]) => {
      question.selectedItemValues = displayValues.map((text, index) =>
        question.createItemValue(["2510911"][index], text),
      ) as SelectedChoiceItem[];
    });
    const setItemsNewer = vi.fn((displayValues: string[]) => {
      question.selectedItemValues = displayValues.map((text, index) =>
        question.createItemValue(["3117735"][index], text),
      ) as SelectedChoiceItem[];
    });

    const older = completeLazyLoadChoiceDisplayValues({
      question,
      requestedValues: ["2510911"],
      labelsByValue: new Map([["2510911", { default: "Sevilla" }]]),
      setItems: setItemsOlder,
      fetchLabels: async () => {
        await fetchGate;
        return new Map([["999", { default: "stale-extra" }]]);
      },
    });

    question.value = ["3117735"];
    const newer = completeLazyLoadChoiceDisplayValues({
      question,
      requestedValues: ["3117735"],
      labelsByValue: new Map([["3117735", { default: "Madrid" }]]),
      setItems: setItemsNewer,
      fetchLabels: async () => new Map(),
    });

    await newer;
    releaseFetch?.();
    await older;

    const selected = question.selectedItemValues as SelectedChoiceItem[];
    expect(selected.map((item) => item.text)).toEqual(["Madrid"]);
  });

  it.each([
    {
      name: "single-language form + single-language data list",
      formLocale: "",
      labels: { default: "Sevilla" },
      expectedText: "Sevilla",
      expectedLocaleJson: undefined as Record<string, string> | undefined,
    },
    {
      name: "multilingual form + single-language data list falls back to default",
      formLocale: "fr",
      labels: { default: "Sevilla" },
      expectedText: "Sevilla",
      expectedLocaleJson: undefined as Record<string, string> | undefined,
    },
    {
      name: "form locale missing from data list falls back to default",
      formLocale: "de",
      labels: { default: "Sevilla", es: "Sevilla ES" },
      expectedText: "Sevilla",
      expectedLocaleJson: { default: "Sevilla", es: "Sevilla ES" },
    },
    {
      name: "matching multilingual form and data list locale",
      formLocale: "es",
      labels: { default: "Seville", es: "Sevilla" },
      expectedText: "Sevilla",
      expectedLocaleJson: { default: "Seville", es: "Sevilla" },
    },
  ])(
    "$name",
    async ({ formLocale, labels, expectedText, expectedLocaleJson }) => {
      const model = new Model({
        pages: [
          {
            elements: [
              {
                type: "tagbox",
                name: "cities",
                choicesLazyLoadEnabled: true,
              },
            ],
          },
        ],
      });
      model.locale = formLocale;

      const question = model.getQuestionByName("cities") as SelectBaseQuestion;
      question.value = ["2510911"];

      const setItems = vi.fn((displayValues: string[]) => {
        question.selectedItemValues = displayValues.map((text, index) =>
          question.createItemValue(["2510911"][index], text),
        ) as SelectedChoiceItem[];
      });

      await completeLazyLoadChoiceDisplayValues({
        question,
        requestedValues: ["2510911"],
        labelsByValue: new Map([["2510911", labels as Record<string, string>]]),
        setItems,
        activeLocale: formLocale || undefined,
        fetchLabels: async () => new Map(),
      });

      const selected = question.selectedItemValues as SelectedChoiceItem[];
      expect(selected[0]?.text).toBe(expectedText);

      const localeJson = selected[0]?.locText.getJson();
      if (expectedLocaleJson) {
        expect(localeJson).toEqual(expectedLocaleJson);
      } else {
        // SurveyJS stores a plain string when only `default` is present.
        expect(localeJson).toBe(labels.default);
      }
    },
  );
});

describe("notifyLazySelectedItemLocaleStrings", () => {
  it("fires locText.onStringChanged for lazy selected items", () => {
    const model = new Model({
      locale: "es",
      pages: [
        {
          elements: [
            {
              type: "tagbox",
              name: "cities",
              choicesLazyLoadEnabled: true,
            },
          ],
        },
      ],
    });
    model.locale = "es";

    const question = model.getQuestionByName("cities") as SelectBaseQuestion;
    const item = question.createItemValue("2462881", "El Aaiún");
    item.locText.setJson({
      default: "Laayoune",
      es: "El Aaiún",
      fr: "Laâyoune",
      it: "El Aaiún",
    });
    question.selectedItemValues = [item] as SelectedChoiceItem[];

    const onStringChanged = vi.fn();
    item.locText.onStringChanged.add(onStringChanged);

    notifyLazySelectedItemLocaleStrings(question);

    expect(onStringChanged).toHaveBeenCalled();
  });

  it("is a no-op when choicesLazyLoadEnabled is false", () => {
    const model = new Model({
      elements: [{ type: "tagbox", name: "cities", choices: ["A"] }],
    });
    const question = model.getQuestionByName("cities") as SelectBaseQuestion;
    const item = question.createItemValue("A", "A");
    question.selectedItemValues = [item] as SelectedChoiceItem[];
    const onStringChanged = vi.fn();
    item.locText.onStringChanged.add(onStringChanged);

    notifyLazySelectedItemLocaleStrings(question);

    expect(onStringChanged).not.toHaveBeenCalled();
  });
});
