import { Serializer, SurveyModel } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import { CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY } from "@/lib/survey-features/carry-forward/constants";
import { MATRIX_TYPE } from "../constants";
import { registerMatrixCarouselSchema } from "../infrastructure/registry";

type Choice = { value: string; text: string };
type ChoicesProperty = {
  choicesfunc?: (obj: unknown, callback: (choices: Choice[]) => void) => void;
};

const CHAINED_ROW_SOURCE_ELEMENTS = [
  {
    type: "checkbox",
    name: "question1",
    choices: [
      { value: "1", text: "Item 1" },
      { value: "2", text: "Item 2" },
    ],
  },
  { type: "checkbox", name: "question2", choicesFromQuestion: "question1" },
  {
    type: MATRIX_TYPE,
    name: "grid",
    edxDisplayMode: "carousel",
    edxCarryForwardEnabled: true,
    edxCarryForwardSources: ["question2"],
    columns: ["Col"],
  },
];

function getRowPriorityItems(survey: SurveyModel): Promise<Choice[]> {
  const property = Serializer.findProperty(
    MATRIX_TYPE,
    CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,
  ) as unknown as ChoicesProperty;

  return new Promise((resolve) =>
    property.choicesfunc?.(survey.getQuestionByName("grid"), resolve),
  );
}

describe("Matrix carousel priority items: chained row source", () => {
  beforeAll(() => {
    registerMatrixCarouselSchema();
  });

  it("lists the copied question's choices when the row source uses choicesFromQuestion", async () => {
    const survey = new SurveyModel({ elements: CHAINED_ROW_SOURCE_ELEMENTS });
    survey.setDesignMode(true);

    await expect(getRowPriorityItems(survey)).resolves.toEqual([
      { value: "1", text: "question2: (Item 1)" },
      { value: "2", text: "question2: (Item 2)" },
    ]);
  });
});
