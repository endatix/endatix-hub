import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  Question,
  QuestionMatrixDynamicModel,
  QuestionPanelDynamicModel,
  SurveyModel,
} from "survey-core";
import { registerQuestionLoopsGlobals } from "@/lib/survey-features/question-loops/infrastructure/registry";
import { bindFeatureToSurvey } from "@/lib/survey-features/question-loops/infrastructure/survey-bindings";
import { isLoopQuestion } from "@/lib/survey-features/question-loops/utils/collect-loop-questions";
import { registerLoopAwareSummaryTable } from "../register-loop-aware-summary-table";
import {
  LOOP_NAME,
  LOOP_SOURCE_NAME,
  MATRIX_NAME,
  NESTED_LOOP_NAME,
  OUTER_PANEL_NAME,
  PLAIN_PANEL_NAME,
  loopSurvey,
  matrixSurvey,
  nestedLoopSurvey,
  plainPanelSurvey,
} from "./fixtures/input-per-page-survey";

const disposers: Array<() => void> = [];

/** Loads the form the way the runner does: model, loop bindings, summary handler. */
function load(json: object): SurveyModel {
  const survey = new SurveyModel(json);
  disposers.push(bindFeatureToSurvey(survey));
  disposers.push(registerLoopAwareSummaryTable(survey));
  return survey;
}

/** The step the question shows: a cell question, or the question itself on its summary. */
function currentInput(question: Question): Question | undefined {
  return question.singleInputQuestion;
}

/** The innermost step shown, descending through nested dynamic questions. */
function leafInput(question: Question): Question | undefined {
  let input = currentInput(question);
  while (input && input !== question) {
    const inner = currentInput(input);
    if (!inner || inner === input) break;
    question = input;
    input = inner;
  }
  return input;
}

/** Presses Next through the dynamic question and returns every step it showed. */
function walkInputs(survey: SurveyModel, question: Question): Question[] {
  const seen: Question[] = [];
  while (survey.currentSingleQuestion === question) {
    const input = leafInput(question);
    if (!input || seen.includes(input)) break;
    seen.push(input);
    survey.performNext();
  }
  return seen;
}

describe("registerLoopAwareSummaryTable in one-input-per-page layout (hub#1385 regression)", () => {
  beforeAll(() => {
    registerQuestionLoopsGlobals();
  });

  afterEach(() => {
    disposers.splice(0).forEach((dispose) => dispose());
  });

  it("keeps the summary step for a dynamic matrix, where Add row adds a row", () => {
    const survey = load(matrixSurvey);
    const matrix = survey.getQuestionByName(MATRIX_NAME) as QuestionMatrixDynamicModel;

    expect(currentInput(matrix)?.name).toBe("label");
    expect(matrix.getSingleInputAddText()).toBeUndefined();

    currentInput(matrix)!.value = "First";
    survey.performNext();

    expect(currentInput(matrix)).toBe(matrix);
    expect(matrix.getSingleInputAddText()).toBeTruthy();
    matrix.singleInputAddItem();
    expect(matrix.rowCount).toBe(2);
  });

  it("keeps the summary step for a plain dynamic panel, where Add adds a panel", () => {
    const survey = load(plainPanelSurvey);
    const panel = survey.getQuestionByName(PLAIN_PANEL_NAME) as QuestionPanelDynamicModel;

    expect(isLoopQuestion(panel)).toBe(false);
    expect(currentInput(panel)?.name).toBe("label");
    expect(panel.getSingleInputAddText()).toBeUndefined();

    currentInput(panel)!.value = "First";
    survey.performNext();

    expect(currentInput(panel)).toBe(panel);
    expect(panel.getSingleInputAddText()).toBeTruthy();
    panel.singleInputAddItem();
    expect(panel.panelCount).toBe(2);
  });

  it("still skips the summary step for a question loop", () => {
    const survey = load(loopSurvey);
    survey.setValue(LOOP_SOURCE_NAME, ["1", "2"]);
    survey.performNext();
    const loop = survey.getQuestionByName(LOOP_NAME) as QuestionPanelDynamicModel;

    expect(isLoopQuestion(loop)).toBe(true);
    expect(loop.panelCount).toBe(2);

    const inputs = walkInputs(survey, loop);
    expect(inputs.map((input) => input.name)).toEqual(["rating", "rating"]);
    expect(inputs).not.toContain(loop);
  });

  it("keeps the outer summary but skips the loop's own inside a plain dynamic panel", () => {
    const survey = load(nestedLoopSurvey);
    const outer = survey.getQuestionByName(OUTER_PANEL_NAME) as QuestionPanelDynamicModel;
    const panelSource = outer.panels[0].getQuestionByName(LOOP_SOURCE_NAME);
    panelSource.value = ["1", "2"];
    const nestedLoop = outer.panels[0].getQuestionByName(
      NESTED_LOOP_NAME,
    ) as QuestionPanelDynamicModel;

    expect(isLoopQuestion(outer)).toBe(false);
    expect(isLoopQuestion(nestedLoop)).toBe(true);
    expect(nestedLoop.panelCount).toBe(2);

    const inputs = walkInputs(survey, outer);
    expect(inputs.map((input) => input.name)).toEqual([
      LOOP_SOURCE_NAME,
      "rating",
      "rating",
      OUTER_PANEL_NAME,
    ]);
    expect(inputs).not.toContain(nestedLoop);
  });
});
