import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { SurveyModel } from "survey-core";
import { setSubmissionData } from "@/lib/survey-features/infrastructure/survey-utils";
import { registerQuestionLoopsGlobals } from "../infrastructure/registry";
import { bindFeatureToSurvey } from "../infrastructure/survey-bindings";

// A loop over a hidden question whose value comes only from defaultValueExpression, opened the
// way the public form opens a stored submission: build, assign the stored data, then bind.
const loopSurvey = {
  pages: [
    { elements: [{ type: "text", name: "Q1" }] },
    {
      elements: [
        {
          type: "checkbox",
          name: "DUMMY",
          visible: false,
          clearIfInvisible: "none",
          defaultValueExpression: "['B','A','C']",
          choices: ["A", "B", "C"],
        },
        {
          type: "paneldynamic",
          name: "LOOP",
          displayMode: "carousel",
          allowAddPanel: false,
          allowRemovePanel: false,
          loopSource: ["DUMMY"],
          templateElements: [
            { type: "radiogroup", name: "R", choices: [1, 2, 3] },
          ],
        },
      ],
    },
  ],
};

type Loop = {
  panelCount: number;
  panels: Array<{ getQuestionByName(name: string): { value: unknown } }>;
};

const disposers: Array<() => void> = [];

function openStored(stored: string): SurveyModel {
  const survey = new SurveyModel(loopSurvey);
  setSubmissionData(survey, stored);
  disposers.push(bindFeatureToSurvey(survey));
  return survey;
}

const loopOf = (survey: SurveyModel) =>
  survey.getQuestionByName("LOOP") as unknown as Loop;

describe("Loop over a defaulted source on a stored submission", () => {
  beforeAll(() => {
    registerQuestionLoopsGlobals();
  });

  afterEach(() => {
    disposers.splice(0).forEach((dispose) => dispose());
  });

  it("builds every panel when the stored data holds only a prefill", () => {
    const survey = openStored(JSON.stringify({ panelistId: "p-0001" }));

    expect(survey.getValue("DUMMY")).toEqual(["B", "A", "C"]);
    expect(loopOf(survey).panelCount).toBe(3);
  });

  it("keeps loop answers across a resume", () => {
    const first = openStored(JSON.stringify({ panelistId: "p-0001" }));
    loopOf(first).panels[0].getQuestionByName("R").value = 2;

    const resumed = openStored(JSON.stringify(first.data));

    expect(loopOf(resumed).panelCount).toBe(3);
    expect(
      (resumed.getValue("LOOP") as Array<{ itemValue: string; R?: number }>)[0],
    ).toMatchObject({ itemValue: "B", R: 2 });
  });
});
