import { beforeAll, describe, expect, it } from "vitest";
import { Serializer, type ItemValue, type PanelModel, type Question } from "survey-core";
import { SurveyCreatorModel } from "survey-creator-core";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { localDateTimeExtension } from "@/lib/survey-features/local-date-time";
import { bindAudienceToCreator, isPrefillCompatible, prefillVariableOf } from "..";

describe("isPrefillCompatible", () => {
  it("matches when the question's type and inputType equal one target", () => {
    // Act & Assert
    expect(
      isPrefillCompatible(
        { type: "text", inputType: "number" },
        [{ type: "text", inputType: "number" }, { type: "rating" }],
      ),
    ).toBe(true);
    expect(
      isPrefillCompatible(
        { type: "text", inputType: "number" },
        [{ type: "text" }, { type: "rating" }],
      ),
    ).toBe(false);
  });

  it("treats an omitted inputType as plain text", () => {
    // Act & Assert
    expect(
      isPrefillCompatible({ type: "text" }, [{ type: "text" }, { type: "comment" }]),
    ).toBe(true);
    expect(
      isPrefillCompatible({ type: "text", inputType: "text" }, [{ type: "text" }]),
    ).toBe(true);
    expect(
      isPrefillCompatible({ type: "text" }, [{ type: "text", inputType: "datetime-local" }]),
    ).toBe(false);
  });

  it("does not treat dropdown and radiogroup as the same type", () => {
    // Act & Assert
    expect(
      isPrefillCompatible({ type: "dropdown" }, [{ type: "radiogroup" }, { type: "buttongroup" }]),
    ).toBe(false);
    expect(
      isPrefillCompatible(
        { type: "dropdown" },
        [{ type: "dropdown" }, { type: "radiogroup" }],
      ),
    ).toBe(true);
  });
});

describe("prefillVariableOf", () => {
  it("reads a Property from a plain prefill or edxLocalDateTime", () => {
    // Act & Assert
    expect(prefillVariableOf("{age}")).toBe("age");
    expect(prefillVariableOf("edxLocalDateTime({renews_at})")).toBe("renews_at");
  });

  it("leaves a calculation, another function, or extra text unnamed", () => {
    // Act & Assert
    expect(prefillVariableOf("{seats} * 2")).toBeUndefined();
    expect(prefillVariableOf("regexMatch({age}, '\\\\d+')")).toBeUndefined();
    expect(prefillVariableOf("edxLocalDateTime({renews_at}) + 1")).toBeUndefined();
    expect(prefillVariableOf("{age} years")).toBeUndefined();
    expect(prefillVariableOf(undefined)).toBeUndefined();
  });
});

const AGE = {
  type: "text",
  name: "age",
  title: "Age",
  inputType: "number",
  prefillTargets: [{ type: "text", inputType: "number" }, { type: "rating" }],
};
const REGION = {
  type: "dropdown",
  name: "region",
  title: "Region",
  prefillTargets: [{ type: "dropdown" }, { type: "radiogroup" }, { type: "buttongroup" }],
};
const RENEWS = {
  type: "text",
  name: "renews_at",
  title: "Renews at",
  prefillTargets: [{ type: "text" }, { type: "text", inputType: "datetime-local" }],
};

function variables(
  elements: object[] | null,
): AudienceVariables {
  return {
    variablePresets: elements
      ? { definition: { elements }, presets: [], totalPresets: 0 }
      : null,
    coverage: { participants: { test: 0, real: 0 }, properties: [] },
    editing: { allowAdd: false, allowEdit: false, allowDelete: false },
    readOnlyPresets: [],
  };
}

function designer(json: object) {
  const creator = new SurveyCreatorModel({});
  creator.JSON = json;
  return creator;
}

function open(creator: SurveyCreatorModel, name: string) {
  const question = creator.survey.getQuestionByName(name);
  if (!question) throw new Error(`missing question ${name}`);
  creator.selectElement(question);
  const grid = creator.propertyGrid;
  return {
    question,
    header: grid.getQuestionByName("edxPrefillHeader"),
    prefill: grid.getQuestionByName("edxPrefillFrom"),
    editable: grid.getQuestionByName("edxPrefillEditable"),
  };
}

type DropdownEditor = Question & {
  dropdownListModel: {
    popupModel: { toggleVisibility: () => void };
    listModel: { actions: ItemValue[]; onItemClick: (item: ItemValue) => void };
  };
};

/** The row the open Prefill from popup renders, not `editor.choices`. */
function choice(prefill: Question | null, value: string) {
  const list = (prefill as DropdownEditor | null)?.dropdownListModel;
  if (!list) return undefined;
  list.popupModel.toggleVisibility();
  const row = list.listModel.actions.find((item) => item.value === value);
  list.popupModel.toggleVisibility();
  return row;
}

type Row = { text: string; isEnabled: boolean; kind: unknown };

/** The open popup's rows by value, read while this question is selected. */
function rows(prefill: Question | null): Record<string, Row> {
  const list = (prefill as DropdownEditor | null)?.dropdownListModel;
  if (!list) return {};
  list.popupModel.toggleVisibility();
  const read = Object.fromEntries(
    list.listModel.actions.map((item) => [
      item.value,
      { text: item.text, isEnabled: item.isEnabled, kind: item.getPropertyValue("edxPrefillKind") },
    ]),
  );
  list.popupModel.toggleVisibility();
  return read;
}

/** Clicks a row in the open popup, as the author does. */
function pick(prefill: Question | null, value: string): void {
  const list = (prefill as DropdownEditor | null)?.dropdownListModel;
  if (!list) throw new Error("no Prefill from list");
  list.popupModel.toggleVisibility();
  const row = list.listModel.actions.find((item) => item.value === value);
  if (!row) throw new Error(`missing row ${value}`);
  list.listModel.onItemClick(row);
}

function expressionLink(prefill: Question | null) {
  return (prefill?.parent as PanelModel | undefined)?.getQuestionByName("edxPrefillFrom_expression") as unknown as {
    isVisible: boolean;
    startWithNewLine: boolean;
    linkValueText: string;
    allowClear: boolean;
    linkClickCallback: () => void;
  } | null;
}

describe("Prefill from in the designer", () => {
  beforeAll(() => {
    localDateTimeExtension.onInit?.();
  });

  const form = {
    elements: [
      { type: "text", name: "years", inputType: "number" },
      { type: "text", name: "when", inputType: "datetime-local" },
      { type: "text", name: "doubled", defaultValueExpression: "{seats} * 2", readOnly: true },
    ],
  };

  it("writes {variable}, and edxLocalDateTime on a datetime-local question", () => {
    // Arrange
    const creator = designer(form);
    bindAudienceToCreator(creator, {
      variables: variables([AGE, REGION, RENEWS]),
      refresh: () => Promise.resolve(Result.success(variables([AGE, REGION, RENEWS]))),
    });

    // Act
    open(creator, "years").prefill!.value = "age";
    open(creator, "when").prefill!.value = "renews_at";

    // Assert
    expect(creator.survey.getQuestionByName("years")?.defaultValueExpression).toBe("{age}");
    expect(creator.survey.getQuestionByName("when")?.defaultValueExpression).toBe(
      "edxLocalDateTime({renews_at})",
    );
    expect(JSON.stringify(creator.JSON)).not.toContain("edxPrefill");
  });

  it("keeps Prefill from after creator.JSON replaces the designer survey", () => {
    // Arrange — designer order: bind first, then load the form (useCreatorJson)
    const creator = new SurveyCreatorModel({});
    bindAudienceToCreator(creator, {
      variables: variables([AGE, REGION, RENEWS]),
      refresh: () => Promise.resolve(Result.success(variables([AGE, REGION, RENEWS]))),
    });
    creator.JSON = form;

    // Act
    const years = open(creator, "years");
    expect(years.prefill?.isVisible).toBe(true);
    expect(choice(years.prefill, "age")?.isEnabled).toBe(true);
    expect(choice(years.prefill, "region")?.isEnabled).toBe(false);
    years.prefill!.value = "age";

    // Assert
    expect(creator.survey.getQuestionByName("years")?.defaultValueExpression).toBe("{age}");
  });

  it("locks the question when Allow respondent to edit is off, and clears readOnly when it is on", () => {
    // Arrange
    const creator = designer(form);
    bindAudienceToCreator(creator, {
      variables: variables([AGE, RENEWS]),
      refresh: () => Promise.resolve(Result.success(variables([AGE, RENEWS]))),
    });
    const years = open(creator, "years");

    // Act
    const hiddenBefore = years.editable?.isVisible === true;
    years.prefill!.value = "age";
    expect(years.editable?.isVisible).toBe(true);
    const shown = open(creator, "years");
    shown.editable!.value = false;
    const locked = shown.question.toJSON();
    shown.editable!.value = true;
    const unlocked = shown.question.toJSON();

    // Assert
    expect(hiddenBefore).toBe(false);
    expect(shown.editable?.isVisible).toBe(true);
    expect(locked.readOnly).toBe(true);
    expect(locked.defaultValueExpression).toBe("{age}");
    expect(unlocked.readOnly).toBeUndefined();
    expect(unlocked.defaultValueExpression).toBe("{age}");
    expect(unlocked.edxPrefillFrom).toBeUndefined();
    expect(unlocked.edxPrefillEditable).toBeUndefined();
  });

  it("clears the prefill and readOnly together, and leaves a calculation alone", () => {
    // Arrange
    const creator = designer(form);
    bindAudienceToCreator(creator, {
      variables: variables([AGE]),
      refresh: () => Promise.resolve(Result.success(variables([AGE]))),
    });
    const years = open(creator, "years");
    years.prefill!.value = "age";
    years.editable!.value = false;

    // Act
    years.prefill!.value = undefined;
    const cleared = years.question.toJSON();
    const doubled = open(creator, "doubled");
    const shown = doubled.prefill?.value;
    const customRow = choice(doubled.prefill, "edx-custom-expression")?.text;
    doubled.prefill!.value = undefined;
    open(creator, "years");
    const stillCustom = open(creator, "doubled");

    // Assert
    expect(cleared.defaultValueExpression).toBeUndefined();
    expect(cleared.readOnly).toBe(true);
    expect(doubled.question.defaultValueExpression).toBe("{seats} * 2");
    expect(doubled.question.readOnly).toBe(true);
    expect(shown).toBe("edx-custom-expression");
    expect(customRow).toBe("Custom expression");
    expect(doubled.prefill?.isReadOnly).toBe(false);
    expect(stillCustom.prefill?.value).toBe("edx-custom-expression");
    expect(stillCustom.prefill?.isReadOnly).toBe(false);
    expect(stillCustom.editable?.isVisible).toBe(true);
    expect(stillCustom.editable?.value).toBe(false);
    stillCustom.editable!.value = true;
    expect(stillCustom.question.defaultValueExpression).toBe("{seats} * 2");
    expect(stillCustom.question.readOnly).toBe(false);
    const link = expressionLink(stillCustom.prefill);
    expect(link?.isVisible).toBe(true);
    expect(link?.startWithNewLine).toBe(true);
    expect(link?.allowClear).toBe(false);
    expect(link?.linkValueText).toContain("Edit it in Default value expression.");
    link?.linkClickCallback();
    const expression = creator.propertyGrid.getQuestionByName("defaultValueExpression");
    expect(creator.propertyGrid.currentPage).toBe(expression?.page);
    expect(stillCustom.editable?.isVisible).toBe(true);
  });

  it("lists every Property and disables the ones this question cannot take", () => {
    // Arrange
    const creator = designer(form);
    bindAudienceToCreator(creator, {
      variables: variables([AGE, REGION, RENEWS]),
      refresh: () => Promise.resolve(Result.success(variables([AGE, REGION, RENEWS]))),
    });

    // Act
    const years = open(creator, "years");
    const yearsRows = rows(years.prefill);
    pick(years.prefill, "region");
    const afterDisabledPick = years.question.defaultValueExpression;
    const when = open(creator, "when");
    const whenRows = rows(when.prefill);

    // Assert
    expect(yearsRows.age).toEqual({ text: "Age", isEnabled: true, kind: "number" });
    expect(yearsRows.region).toEqual({
      text: "Region",
      isEnabled: false,
      kind: "Single choice. Use a Dropdown, Radio or Button group question.",
    });
    expect(yearsRows.renews_at).toEqual({
      text: "Renews at",
      isEnabled: false,
      kind: "Date-time. Use a Single-Line Input or Date and Time question.",
    });
    expect(afterDisabledPick).toBeUndefined();
    expect(whenRows.renews_at?.isEnabled).toBe(true);
    expect(whenRows.age?.isEnabled).toBe(false);
    expect(whenRows.region?.isEnabled).toBe(false);
    expect(when.prefill?.placeholder).not.toBe("No Property fits this question type.");
    const page = creator.propertyGrid.getPageByName("personalization");
    expect(years.prefill?.page?.name).toBe("personalization");
    expect(page?.title).toBe("Personalization");
    expect((page as { iconName?: string } | null)?.iconName).toBe("icon-personalization");
    expect(years.prefill?.isReadOnly).toBe(false);
    expect(years.prefill?.description).toContain("Start this answer with the participant's Property value.");
    expect(years.editable?.description).toContain("not a security control");
    expect(Serializer.findProperty("itemvalue", "edxPrefillKind")?.isSerializable).toBe(false);
  });

  it("disables Prefill from when nothing can prefill, and hides it when personalization is not bound", () => {
    // Arrange
    const unbound = designer(form);
    const noPresets = designer(form);
    const olderApi = designer(form);
    const bound = designer(form);
    bindAudienceToCreator(
      noPresets,
      {
        variables: variables(null),
        refresh: () => Promise.resolve(Result.success(variables(null))),
      },
      undefined,
      "12",
    );
    bindAudienceToCreator(olderApi, {
      variables: variables([{ type: "text", name: "age", title: "Age", inputType: "number" }]),
      refresh: () =>
        Promise.resolve(
          Result.success(
            variables([{ type: "text", name: "age", title: "Age", inputType: "number" }]),
          ),
        ),
    });
    const unbind = bindAudienceToCreator(bound, {
      variables: variables([AGE]),
      refresh: () => Promise.resolve(Result.success(variables([AGE]))),
    });

    // Act
    const empty = open(noPresets, "years");
    const visibleWhileBound = open(bound, "years").prefill?.isVisible;
    unbind();
    const older = open(olderApi, "years");

    // Assert
    expect(open(unbound, "years").prefill?.isVisible).not.toBe(true);
    expect(empty.prefill?.isVisible).toBe(true);
    expect(empty.prefill?.isReadOnly).toBe(true);
    expect(empty.prefill?.page?.name).toBe("personalization");
    expect(empty.prefill?.description).toContain("/forms/12/audience");
    expect(empty.prefill?.description).toContain("Add Properties");
    expect(older.prefill?.isVisible).not.toBe(true);
    expect(olderApi.propertyGrid.getPageByName("personalization")?.isVisible).not.toBe(true);
    expect(visibleWhileBound).toBe(true);
    expect(open(bound, "years").prefill?.isVisible).not.toBe(true);
  });

  it("keeps an author's readOnly when the Property is cleared", () => {
    // Arrange
    const creator = designer({
      elements: [{ type: "text", name: "years", inputType: "number", readOnly: true }],
    });
    bindAudienceToCreator(creator, {
      variables: variables([AGE]),
      refresh: () => Promise.resolve(Result.success(variables([AGE]))),
    });
    const years = open(creator, "years");
    years.prefill!.value = "age";

    // Act
    years.prefill!.value = undefined;

    // Assert
    expect(years.question.defaultValueExpression).toBeUndefined();
    expect(years.question.readOnly).toBe(true);
  });

  it("reloads the Property and readOnly from the saved form", () => {
    // Arrange
    const creator = designer(form);
    const audience = {
      variables: variables([AGE, REGION, RENEWS]),
      refresh: () => Promise.resolve(Result.success(variables([AGE, REGION, RENEWS]))),
    };
    bindAudienceToCreator(creator, audience);
    const years = open(creator, "years");
    years.prefill!.value = "age";
    open(creator, "years").editable!.value = false;

    // Act
    const saved = creator.JSON;
    const again = new SurveyCreatorModel({});
    bindAudienceToCreator(again, audience);
    again.JSON = saved;
    const reloaded = open(again, "years");

    // Assert
    expect(JSON.stringify(saved)).not.toContain("edxPrefill");
    expect(reloaded.question.toJSON()).toEqual({
      name: "years",
      inputType: "number",
      defaultValueExpression: "{age}",
      readOnly: true,
    });
    expect(reloaded.prefill?.value).toBe("age");
    expect(reloaded.editable?.value).toBe(false);
  });

  it("hides Prefill on a question type without defaultValueExpression", () => {
    // Arrange
    const creator = designer({
      elements: [
        { type: "text", name: "years", inputType: "number" },
        { type: "html", name: "note", html: "<p>n</p>" },
        { type: "image", name: "pic", imageLink: "https://example.com/a.png" },
        { type: "expression", name: "calc", expression: "1+1" },
      ],
    });
    bindAudienceToCreator(creator, {
      variables: variables([AGE]),
      refresh: () => Promise.resolve(Result.success(variables([AGE]))),
    });

    // Act & Assert
    expect(open(creator, "years").prefill?.isVisible).toBe(true);
    expect(open(creator, "note").prefill?.isVisible).not.toBe(true);
    expect(open(creator, "pic").prefill?.isVisible).not.toBe(true);
    expect(open(creator, "calc").prefill?.isVisible).not.toBe(true);
  });

  it("hides Prefill on a question type no Property can fill", () => {
    // Arrange
    const creator = designer({
      elements: [
        { type: "dropdown", name: "plan", choices: ["a"] },
        { type: "matrixdynamic", name: "grid", columns: [{ name: "c" }] },
        { type: "file", name: "upload" },
        { type: "signaturepad", name: "sign" },
      ],
    });
    bindAudienceToCreator(creator, {
      variables: variables([AGE, REGION]),
      refresh: () => Promise.resolve(Result.success(variables([AGE, REGION]))),
    });

    // Act & Assert
    expect(open(creator, "plan").prefill?.isVisible).toBe(true);
    expect(open(creator, "grid").prefill?.isVisible).not.toBe(true);
    expect(open(creator, "upload").prefill?.isVisible).not.toBe(true);
    expect(open(creator, "sign").prefill?.isVisible).not.toBe(true);
  });

  it("offers no clear button while a custom expression is shown", () => {
    // Arrange
    const creator = designer(form);
    bindAudienceToCreator(creator, {
      variables: variables([AGE]),
      refresh: () => Promise.resolve(Result.success(variables([AGE]))),
    });

    // Act
    const doubled = open(creator, "doubled").prefill as (Question & { allowClear: boolean }) | null;
    const years = open(creator, "years").prefill as (Question & { allowClear: boolean }) | null;

    // Assert
    expect(doubled?.allowClear).toBe(false);
    expect(years?.allowClear).toBe(true);
  });

  it("keeps each form's Properties and Participants link", () => {
    // Arrange
    const first = designer(form);
    const second = designer(form);
    bindAudienceToCreator(
      first,
      {
        variables: variables([AGE]),
        refresh: () => Promise.resolve(Result.success(variables([AGE]))),
      },
      undefined,
      "11",
    );
    bindAudienceToCreator(
      second,
      {
        variables: variables(null),
        refresh: () => Promise.resolve(Result.success(variables(null))),
      },
      undefined,
      "22",
    );

    // Act
    const withAge = open(first, "years");
    const empty = open(second, "years");
    const stillFirst = open(first, "years");

    // Assert
    expect(choice(withAge.prefill, "age")?.text).toBe("Age");
    expect(choice(empty.prefill, "age")).toBeUndefined();
    expect(stillFirst.prefill?.description).toContain("Start this answer");
    expect(stillFirst.prefill?.description).not.toContain("/forms/22/audience");
    expect(empty.prefill?.description).toContain("/forms/22/audience");
    expect(empty.prefill?.description).not.toContain("/forms/11/audience");
  });

  it("greys Prefill rows again when inputType changes", () => {
    // Arrange
    const creator = designer({
      elements: [{ type: "text", name: "size", inputType: "number" }],
    });
    bindAudienceToCreator(creator, {
      variables: variables([AGE, REGION]),
      refresh: () => Promise.resolve(Result.success(variables([AGE, REGION]))),
    });
    const size = open(creator, "size");
    const numberRows = rows(size.prefill);

    // Act
    size.question.inputType = "date";
    const dateRows = rows(size.prefill);

    // Assert
    expect(numberRows.region?.isEnabled).toBe(false);
    expect(numberRows.age?.isEnabled).toBe(true);
    expect(dateRows.age?.isEnabled).toBe(false);
    expect(dateRows.region?.isEnabled).toBe(false);
  });

  it("keeps the rows greyed after the list is rebuilt", () => {
    // Arrange
    const creator = designer(form);
    bindAudienceToCreator(creator, {
      variables: variables([AGE, REGION]),
      refresh: () => Promise.resolve(Result.success(variables([AGE, REGION]))),
    });
    const years = open(creator, "years");

    // Act — a custom expression adds a row, so SurveyJS rebuilds every row
    years.question.defaultValueExpression = "{age} * 2";
    const rebuilt = rows(years.prefill);

    // Assert
    expect(rebuilt["edx-custom-expression"]?.text).toBe("Custom expression");
    expect(rebuilt.age).toEqual({ text: "Age", isEnabled: true, kind: "number" });
    expect(rebuilt.region?.isEnabled).toBe(false);
    expect(rebuilt.region?.kind).toContain("Single choice.");
  });

  it("says when no Property fits this question", () => {
    // Arrange
    const creator = designer(form);
    bindAudienceToCreator(creator, {
      variables: variables([AGE, REGION]),
      refresh: () => Promise.resolve(Result.success(variables([AGE, REGION]))),
    });

    // Act
    const when = open(creator, "when");

    // Assert
    expect(choice(when.prefill, "age")?.isEnabled).toBe(false);
    expect(choice(when.prefill, "region")?.isEnabled).toBe(false);
    expect(when.prefill?.placeholder).toBe("No Property fits this question type.");
  });
});
