import { describe, expect, it, vi } from "vitest";
import {
  applyUniqueChoices,
  bindLoadingIndicatorObserver,
  choiceValue,
  existingChoiceKeys,
  markAllChoicesLoaded,
  resetLazyChoices,
  uniqueChoices,
  type LazyChoiceQuestion,
} from "../choices-lazy-load-dropdown";

describe("choiceValue", () => {
  it("reads the value, then the id", () => {
    expect(choiceValue({ value: "brand", text: "Brand" })).toBe("brand");
    expect(choiceValue({ id: 7 })).toBe("7");
    expect(choiceValue("plain")).toBe("plain");
    expect(choiceValue(3)).toBe("3");
  });

  it("never stringifies an object into a shared key", () => {
    // `String({})` is "[object Object]", which would collapse every keyless
    // choice onto one entry and drop the rest as duplicates.
    expect(choiceValue({ text: "no value" })).toBe("");
    expect(choiceValue({ value: { nested: true } })).toBe("");
    expect(choiceValue(null)).toBe("");
    expect(choiceValue(undefined)).toBe("");
  });
});

describe("uniqueChoices", () => {
  it("keeps first occurrence and drops keyless items", () => {
    expect(
      uniqueChoices([
        { value: "a" },
        { value: "a", text: "dup" },
        { text: "keyless" },
        { value: "b" },
      ]),
    ).toEqual([{ value: "a" }, { value: "b" }]);
  });
});

describe("lazy choice buffer", () => {
  const makeQuestion = (): LazyChoiceQuestion => ({
    choices: [{ value: "b" }],
    dropdownListModel: {
      itemsSettings: { items: [{ value: "a" }, { value: "b" }] },
      listModel: { isAllDataLoaded: false },
    },
  });

  it("collects keys from the buffer and the live choices", () => {
    expect(existingChoiceKeys(makeQuestion())).toEqual(new Set(["a", "b"]));
  });

  it("collapses buffer and choices onto one deduped list", () => {
    const question = makeQuestion();

    expect(applyUniqueChoices(question)).toEqual([
      { value: "a" },
      { value: "b" },
    ]);
    expect(question.choices).toEqual([{ value: "a" }, { value: "b" }]);
    expect(question.dropdownListModel?.itemsSettings?.items).toEqual([
      { value: "a" },
      { value: "b" },
    ]);
  });

  it("empties both sides on reset", () => {
    const question = makeQuestion();

    resetLazyChoices(question);

    expect(question.choices).toEqual([]);
    expect(question.dropdownListModel?.itemsSettings?.items).toEqual([]);
  });

  it("settles the loading row on the last page", () => {
    const question = makeQuestion();

    markAllChoicesLoaded(question, 2);

    expect(question.dropdownListModel?.itemsSettings?.totalCount).toBe(2);
    expect(question.dropdownListModel?.listModel?.isAllDataLoaded).toBe(true);
  });
});

describe("bindLoadingIndicatorObserver", () => {
  /** `scrollableContainer` throws once the vendor drops listContainerHtmlElement. */
  function makeDropdown(options: { unmounted?: boolean } = {}) {
    const container = {
      scrollHeight: 800,
      scrollTop: 0,
      clientHeight: 240,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const popupModel = {
      isVisible: false,
      onVisibilityChanged: { add: vi.fn(), remove: vi.fn() },
    };
    const listModel = {
      setLoadingIndicatorVisibilityObserver: vi.fn(),
      get scrollableContainer() {
        if (options.unmounted) {
          throw new TypeError(
            "Cannot read properties of undefined (reading 'querySelector')",
          );
        }
        return container;
      },
    };
    const question: LazyChoiceQuestion = {
      dropdownListModel: {
        popupModel,
        listModel,
        updateQuestionChoices: vi.fn(),
      },
    };
    return { question, container, popupModel, listModel, options };
  }

  it("detaches from the element it attached to, even after the list unmounts", () => {
    const dropdown = makeDropdown();
    const unbind = bindLoadingIndicatorObserver(dropdown.question);
    const onPopupVisibility =
      dropdown.popupModel.onVisibilityChanged.add.mock.calls[0][0];

    onPopupVisibility(null, { isVisible: true });
    expect(dropdown.container.addEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );

    // Tab switch: SurveyJS tears the list down, so reading the getter throws.
    dropdown.options.unmounted = true;
    expect(() => unbind()).not.toThrow();
    expect(dropdown.container.removeEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );
  });

  it("binds without throwing when the list is already unmounted", () => {
    const dropdown = makeDropdown({ unmounted: true });

    const unbind = bindLoadingIndicatorObserver(dropdown.question);
    const onVisible =
      dropdown.listModel.setLoadingIndicatorVisibilityObserver.mock.calls[0][0];
    dropdown.popupModel.isVisible = true;

    expect(() => onVisible(true)).not.toThrow();
    expect(
      dropdown.question.dropdownListModel?.updateQuestionChoices,
    ).not.toHaveBeenCalled();
    expect(() => unbind()).not.toThrow();
  });
});
