import { Serializer, SurveyModel } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import { registerDataListGlobals } from "@/lib/survey-features/data-lists/infrastructure/registry";
import { getPropertyGridLazyChoiceProvider } from "@/lib/survey-features/data-lists/infrastructure/property-grid-lazy-choice-registry";
import type { PropertyGridLazyChoiceContext } from "@/lib/survey-features/data-lists/types";
import { CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY } from "../constants";
import { registerAdvancedCarryForwardGlobals } from "../infrastructure/registry";
import { registerCarryForwardPriorityLazyProvider } from "../infrastructure/carry-forward-priority-lazy-provider";

type Choice = { value: string; text: string };

const QUESTION1 = {
  type: "checkbox",
  name: "question1",
  choices: [
    { value: "1", text: "Item 1" },
    { value: "2", text: "Item 2" },
    { value: "3", text: "Item 3" },
  ],
};

const QUESTION3 = {
  type: "checkbox",
  name: "question3",
  edxCarryForwardEnabled: true,
  edxCarryForwardSources: ["question2"],
  edxCarryForwardMode: "selected",
};

const EXPECTED_VIA_QUESTION2: Choice[] = [
  { value: "1", text: "question2: (Item 1)" },
  { value: "2", text: "question2: (Item 2)" },
  { value: "3", text: "question2: (Item 3)" },
];

function createDesignSurvey(elements: Record<string, unknown>[]): SurveyModel {
  const survey = new SurveyModel({ elements });
  survey.setDesignMode(true);
  return survey;
}

function getPriorityItems(
  survey: SurveyModel,
  targetName: string,
): Promise<Choice[]> {
  const target = survey.getQuestionByName(targetName)!;
  const property = Serializer.findProperty(
    target.getType(),
    CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  ) as unknown as {
    choicesfunc?: (obj: unknown, callback: (choices: Choice[]) => void) => void;
  };

  return new Promise((resolve) => property.choicesfunc?.(target, resolve));
}

describe("Carry forward priority items: chained sources", () => {
  beforeAll(() => {
    registerAdvancedCarryForwardGlobals();
    registerDataListGlobals();
    registerCarryForwardPriorityLazyProvider();
  });

  it("lists the copied question's choices when the source uses choicesFromQuestion", async () => {
    const survey = createDesignSurvey([
      QUESTION1,
      { type: "checkbox", name: "question2", choicesFromQuestion: "question1" },
      QUESTION3,
    ]);

    await expect(getPriorityItems(survey, "question3")).resolves.toEqual(
      EXPECTED_VIA_QUESTION2,
    );
  });

  it("lists the upstream choices when the source carries forward itself", async () => {
    const survey = createDesignSurvey([
      QUESTION1,
      {
        type: "checkbox",
        name: "question2",
        edxCarryForwardEnabled: true,
        edxCarryForwardSources: ["question1"],
      },
      QUESTION3,
    ]);

    await expect(getPriorityItems(survey, "question3")).resolves.toEqual(
      EXPECTED_VIA_QUESTION2,
    );
  });

  it("ignores placeholder choices left on a carry-forward source", async () => {
    const survey = createDesignSurvey([
      QUESTION1,
      {
        type: "checkbox",
        name: "question2",
        edxCarryForwardEnabled: true,
        edxCarryForwardSources: ["question1"],
        choices: ["item1", "item2", "item3"],
      },
      QUESTION3,
    ]);

    await expect(getPriorityItems(survey, "question3")).resolves.toEqual(
      EXPECTED_VIA_QUESTION2,
    );
  });

  it("keeps listing a direct source's own choices", async () => {
    const survey = createDesignSurvey([
      QUESTION1,
      { ...QUESTION3, edxCarryForwardSources: ["question1"] },
    ]);

    await expect(getPriorityItems(survey, "question3")).resolves.toEqual([
      { value: "1", text: "question1: (Item 1)" },
      { value: "2", text: "question1: (Item 2)" },
      { value: "3", text: "question1: (Item 3)" },
    ]);
  });

  it("lists nothing for a cycle", async () => {
    const survey = createDesignSurvey([
      {
        type: "checkbox",
        name: "question2",
        edxCarryForwardEnabled: true,
        edxCarryForwardSources: ["question3"],
      },
      QUESTION3,
    ]);

    await expect(getPriorityItems(survey, "question3")).resolves.toEqual([]);
  });

  it("opens the data-list provider when the chain ends in a data list", () => {
    const survey = createDesignSurvey([
      { type: "tagbox", name: "question1", edxDataListId: "list-1" },
      { type: "checkbox", name: "question2", choicesFromQuestion: "question1" },
      QUESTION3,
    ]);
    const ctx = {
      designerSurvey: survey,
      editingObj: survey.getQuestionByName("question3"),
    } as unknown as PropertyGridLazyChoiceContext;

    const provider = getPropertyGridLazyChoiceProvider(
      CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
    );

    expect(provider?.shouldEnable(ctx)).toBe(true);
  });
});
