import { beforeAll, describe, expect, it, vi } from "vitest";
import { SurveyModel } from "survey-core";
import { registerQuestionLoopsGlobals } from "../infrastructure/registry";
import { bindFeatureToSurvey } from "../infrastructure/survey-bindings";
import { syncLoopTrees } from "../use-cases/sync-loop-tree";
import { SourceSelectionModes } from "../types";

vi.mock("../use-cases/sync-loop-tree", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../use-cases/sync-loop-tree")>();
  return { ...original, syncLoopTrees: vi.fn(original.syncLoopTrees) };
});

function allLoopSurvey(): SurveyModel {
  return new SurveyModel({
    elements: [
      { type: "checkbox", name: "brands", choices: ["a", "b", "c"] },
      {
        type: "paneldynamic",
        name: "loop",
        loopSource: ["brands"],
        choicePattern: SourceSelectionModes.All,
        templateElements: [{ type: "text", name: "why" }],
      },
    ],
  });
}

describe("bindFeatureToSurvey on-load fill", () => {
  beforeAll(() => {
    registerQuestionLoopsGlobals();
  });

  it("fills an All loop on load in the runner", () => {
    vi.mocked(syncLoopTrees).mockClear();

    const dispose = bindFeatureToSurvey(allLoopSurvey());

    expect(syncLoopTrees).toHaveBeenCalledTimes(1);
    dispose();
  });

  it("skips the fill in the designer", () => {
    vi.mocked(syncLoopTrees).mockClear();
    const survey = allLoopSurvey();
    survey.setDesignMode(true);

    const dispose = bindFeatureToSurvey(survey);

    expect(syncLoopTrees).not.toHaveBeenCalled();
    dispose();
  });
});
