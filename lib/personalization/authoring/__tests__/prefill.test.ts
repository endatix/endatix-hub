import { beforeAll, describe, expect, it } from "vitest";
import type { ItemValue } from "survey-core";
import { getLocaleStrings, SurveyCreatorModel } from "survey-creator-core";
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

function choice(prefill: { choices: ItemValue[] } | null, value: string) {
  return prefill?.choices.find((item) => item.value === value);
}

function expressionLink(prefill: { parent?: { getQuestionByName: (name: string) => unknown } } | null) {
  return prefill?.parent?.getQuestionByName("edxPrefillFrom_expression") as {
    isVisible: boolean;
    startWithNewLine: boolean;
    linkValueText: string;
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
    expect(choice(years.prefill, "region")).toBeUndefined();
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
    doubled.prefill!.value = undefined;
    open(creator, "years");
    const stillCustom = open(creator, "doubled");

    // Assert
    expect(cleared.defaultValueExpression).toBeUndefined();
    expect(cleared.readOnly).toBeUndefined();
    expect(doubled.question.defaultValueExpression).toBe("{seats} * 2");
    expect(doubled.question.readOnly).toBe(true);
    expect(shown).toBe("edx-custom-expression");
    expect(choice(doubled.prefill, "edx-custom-expression")?.text).toBe("Custom expression");
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
    expect(link?.linkValueText).toBe("{seats} * 2");
    link?.linkClickCallback();
    const expression = creator.propertyGrid.getQuestionByName("defaultValueExpression");
    expect(creator.propertyGrid.currentPage).toBe(expression?.page);
    expect(stillCustom.editable?.isVisible).toBe(true);
  });

  it("lists only a Property the question's type can take", () => {
    // Arrange
    const creator = designer(form);
    bindAudienceToCreator(creator, {
      variables: variables([AGE, REGION, RENEWS]),
      refresh: () => Promise.resolve(Result.success(variables([AGE, REGION, RENEWS]))),
    });

    // Act
    const years = open(creator, "years");
    const when = open(creator, "when");

    // Assert
    expect(choice(years.prefill, "age")?.isEnabled).toBe(true);
    expect(choice(years.prefill, "age")?.text).toBe("Age");
    expect(choice(years.prefill, "age")?.getPropertyValue("edxPrefillKind")).toBe("number");
    expect(choice(years.prefill, "region")).toBeUndefined();
    expect(choice(years.prefill, "renews_at")).toBeUndefined();
    expect(choice(when.prefill, "renews_at")?.text).toBe("Renews at");
    expect(choice(when.prefill, "renews_at")?.getPropertyValue("edxPrefillKind")).toBe("date-time");
    expect(choice(when.prefill, "age")).toBeUndefined();
    expect(choice(when.prefill, "region")).toBeUndefined();
    const page = creator.propertyGrid.getPageByName("personalization");
    expect(years.prefill?.page?.name).toBe("personalization");
    expect(page?.title).toBe("Personalization");
    expect(page?.iconName).toBe("icon-personalization");
    expect(years.prefill?.isReadOnly).toBe(false);
    expect(getLocaleStrings("en").pehelp.edxPrefillFrom).toContain("default value expression");
    expect(getLocaleStrings("en").pehelp.edxPrefillEditable).toContain("read-only");
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
    const emptyHelp = getLocaleStrings("en").pehelp.edxPrefillFrom;
    const visibleWhileBound = open(bound, "years").prefill?.isVisible;
    unbind();

    // Assert
    expect(open(unbound, "years").prefill?.isVisible).not.toBe(true);
    expect(empty.prefill?.isVisible).toBe(true);
    expect(empty.prefill?.isReadOnly).toBe(true);
    expect(empty.prefill?.page?.name).toBe("personalization");
    expect(emptyHelp).toContain("/forms/12/audience");
    expect(emptyHelp).toContain("Add Properties");
    expect(open(olderApi, "years").prefill?.isVisible).toBe(true);
    expect(open(olderApi, "years").prefill?.isReadOnly).toBe(true);
    expect(visibleWhileBound).toBe(true);
    expect(open(bound, "years").prefill?.isVisible).not.toBe(true);
  });
});
