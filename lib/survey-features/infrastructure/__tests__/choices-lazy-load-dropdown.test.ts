import { describe, expect, it } from "vitest";
import {
  applyUniqueChoices,
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
