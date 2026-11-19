import { Serializer, SurveyModel } from "survey-core";
import { beforeAll, describe, expect, it } from "vitest";
import { registerQuestionLoopsGlobals } from "../infrastructure/registry";

type Choice = { value: string; text: string };
type ChoicesProperty = {
  choicesfunc?: (obj: unknown, callback: (choices: Choice[]) => void) => void;
};

const CHAINED_LOOP_ELEMENTS = [
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
    type: "paneldynamic",
    name: "loop",
    loopSource: ["question2"],
    templateElements: [{ type: "text", name: "inner" }],
  },
];

function getLoopPriorityItems(survey: SurveyModel): Promise<Choice[]> {
  const property = Serializer.findProperty(
    "paneldynamic",
    "priorityItems",
  ) as unknown as ChoicesProperty;

  return new Promise((resolve) =>
    property.choicesfunc?.(survey.getQuestionByName("loop"), resolve),
  );
}

describe("Question loop priority items: chained source", () => {
  beforeAll(() => {
    registerQuestionLoopsGlobals();
  });

  it("lists the copied question's choices when the loop source uses choicesFromQuestion", async () => {
    const survey = new SurveyModel({ elements: CHAINED_LOOP_ELEMENTS });
    survey.setDesignMode(true);

    await expect(getLoopPriorityItems(survey)).resolves.toEqual([
      { value: "1", text: "question2: (Item 1)" },
      { value: "2", text: "question2: (Item 2)" },
    ]);
  });
});
