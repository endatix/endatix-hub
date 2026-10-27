import { beforeAll, describe, expect, it } from "vitest";
import type { ItemValue } from "survey-core";
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
    prefill: grid.getQuestionByName("edxPrefillFrom"),
    editable: grid.getQuestionByName("edxPrefillEditable"),
  };
}

function choice(prefill: { choices: ItemValue[] } | null, value: string) {
  return prefill?.choices.find((item) => item.value === value);
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
    doubled.prefill!.value = undefined;

    // Assert
    expect(cleared.defaultValueExpression).toBeUndefined();
    expect(cleared.readOnly).toBeUndefined();
    expect(doubled.question.defaultValueExpression).toBe("{seats} * 2");
    expect(doubled.question.readOnly).toBe(true);
    expect(doubled.prefill?.value).toBeFalsy();
    expect(doubled.editable?.isVisible).toBe(false);
  });

  it("disables a Property the question's type cannot take, and titles it with that type", () => {
    // Arrange
    const creator = designer(form);
    bindAudienceToCreator(creator, {
      variables: variables([AGE, REGION, RENEWS]),
      refresh: () => Promise.resolve(Result.success(variables([AGE, REGION, RENEWS]))),
    });

    // Act
    const years = open(creator, "years");

    // Assert
    expect(choice(years.prefill, "age")?.isEnabled).toBe(true);
    expect(choice(years.prefill, "age")?.text).toBe("Age");
    expect(choice(years.prefill, "region")?.isEnabled).toBe(false);
    expect(choice(years.prefill, "region")?.text).toBe("Region (single choice)");
    expect(choice(years.prefill, "renews_at")?.isEnabled).toBe(false);
    expect(choice(years.prefill, "renews_at")?.text).toBe("Renews at (date-time)");
  });

  it("hides Prefill from when there are no variables, no prefillTargets, the creator was never bound, or the binding is removed", () => {
    // Arrange
    const unbound = designer(form);
    const noPresets = designer(form);
    const olderApi = designer(form);
    const bound = designer(form);
    bindAudienceToCreator(noPresets, {
      variables: variables(null),
      refresh: () => Promise.resolve(Result.success(variables(null))),
    });
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
    const visibleWhileBound = open(bound, "years").prefill?.isVisible;
    unbind();

    // Assert
    expect(open(unbound, "years").prefill?.isVisible).not.toBe(true);
    expect(open(noPresets, "years").prefill?.isVisible).not.toBe(true);
    expect(open(olderApi, "years").prefill?.isVisible).not.toBe(true);
    expect(visibleWhileBound).toBe(true);
    expect(open(bound, "years").prefill?.isVisible).not.toBe(true);
  });
});
