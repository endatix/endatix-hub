import { describe, expect, it } from "vitest";
import { SurveyModel } from "survey-core";
import {
  isLoopQuestion,
  getAllLoopQuestions,
  resolveDynamicLoopCondition,
} from "../loop-utils";
import { DynamicLoopModel } from "../types";

function createSurvey(
  loopQuestions: Array<{ name: string; loopSource?: string[] }>,
  regularQuestions: string[] = [],
): SurveyModel {
  const elements: any[] = [
    ...loopQuestions.map((q) => ({
      type: "paneldynamic",
      name: q.name,
      templateElements: [{ type: "text", name: "q1" }],
    })),
    ...regularQuestions.map((name) => ({
      type: "text",
      name,
    })),
  ];

  const survey = new SurveyModel({ elements });

  loopQuestions.forEach((q, index) => {
    if (q.loopSource) {
      const question = survey.getAllQuestions()[index] as DynamicLoopModel;
      question.loopSource = q.loopSource;
    }
  });

  return survey;
}

describe("isLoopQuestion", () => {
  describe("arrange", () => {
    it("should set up a survey with various question types", () => {
      const survey = createSurvey(
        [
          { name: "loop1", loopSource: ["item1", "item2"] },
          { name: "loop2", loopSource: [] },
        ],
        ["regular1", "regular2"],
      );

      const questions = survey.getAllQuestions();
      expect(questions).toHaveLength(4);
    });
  });

  describe("act", () => {
    it("should return true for a question with non-empty loopSource array", () => {
      const survey = createSurvey([
        { name: "loop1", loopSource: ["item1", "item2"] },
      ]);

      const question = survey.getQuestionByName("loop1") as DynamicLoopModel;
      const result = isLoopQuestion(question);

      expect(result).toBe(true);
    });

    it("should return false for a question with empty loopSource array", () => {
      const survey = createSurvey([{ name: "loop1", loopSource: [] }]);

      const question = survey.getQuestionByName("loop1") as DynamicLoopModel;
      const result = isLoopQuestion(question);

      expect(result).toBe(false);
    });

    it("should return false for a regular question without loopSource", () => {
      const survey = createSurvey([], ["regular1"]);

      const question = survey.getQuestionByName("regular1");
      const result = isLoopQuestion(question);

      expect(result).toBe(false);
    });

    it("should return false for a null question", () => {
      const result = isLoopQuestion(null as any);

      expect(result).toBe(false);
    });

    it("should return false for a undefined question", () => {
      const result = isLoopQuestion(undefined as any);

      expect(result).toBe(false);
    });

    it("should return false for a question that is not a paneldynamic type", () => {
      const survey = createSurvey([], ["text1"]);

      const question = survey.getQuestionByName("text1");
      const result = isLoopQuestion(question);

      expect(result).toBe(false);
    });
  });

  describe("assert", () => {
    it("should correctly identify loop questions with valid loopSource", () => {
      const survey = createSurvey(
        [
          { name: "loop1", loopSource: ["item1"] },
          { name: "loop2", loopSource: ["a", "b", "c"] },
        ],
        ["regular1"],
      );

      const loop1 = survey.getQuestionByName("loop1") as DynamicLoopModel;
      const loop2 = survey.getQuestionByName("loop2") as DynamicLoopModel;
      const regular1 = survey.getQuestionByName("regular1");

      expect(isLoopQuestion(loop1)).toBe(true);
      expect(isLoopQuestion(loop2)).toBe(true);
      expect(isLoopQuestion(regular1)).toBe(false);
    });
  });
});

describe("getAllLoopQuestions", () => {
  describe("arrange", () => {
    it("should set up a survey with mixed question types", () => {
      const survey = createSurvey(
        [
          { name: "loop1", loopSource: ["item1"] },
          { name: "loop2", loopSource: ["item2"] },
          { name: "loop3", loopSource: [] },
        ],
        ["text1", "dropdown1"],
      );

      const questions = survey.getAllQuestions();
      expect(questions).toHaveLength(5);
    });
  });

  describe("act", () => {
    it("should return all loop questions from the survey", () => {
      const survey = createSurvey(
        [
          { name: "loop1", loopSource: ["item1"] },
          { name: "loop2", loopSource: ["item2"] },
        ],
        ["text1"],
      );

      const result = getAllLoopQuestions(survey);

      expect(result).toHaveLength(2);
      expect(result.map((q) => q.name)).toEqual(["loop1", "loop2"]);
    });

    it("should return empty array when survey is null", () => {
      const result = getAllLoopQuestions(null as any);

      expect(result).toEqual([]);
    });

    it("should return empty array when survey is undefined", () => {
      const result = getAllLoopQuestions(undefined as any);

      expect(result).toEqual([]);
    });

    it("should return empty array when there are no loop questions", () => {
      const survey = createSurvey([], ["text1", "text2"]);

      const result = getAllLoopQuestions(survey);

      expect(result).toHaveLength(0);
    });

    it("should filter out questions with empty loopSource", () => {
      const survey = createSurvey([
        { name: "loop1", loopSource: ["item1"] },
        { name: "emptyLoop", loopSource: [] },
        { name: "loop2", loopSource: ["item2"] },
      ]);

      const result = getAllLoopQuestions(survey);

      expect(result).toHaveLength(2);
      expect(result.map((q) => q.name)).toEqual(["loop1", "loop2"]);
    });
  });

  describe("assert", () => {
    it("should return correct loop questions in a complex survey", () => {
      const survey = createSurvey(
        [
          { name: "loop1", loopSource: ["a"] },
          { name: "loop2", loopSource: ["b"] },
          { name: "loop3", loopSource: ["c"] },
          { name: "emptyLoop", loopSource: [] },
        ],
        ["text1", "dropdown1"],
      );

      const result = getAllLoopQuestions(survey);

      expect(result).toHaveLength(3);
      expect(result.map((q) => q.name).sort()).toEqual([
        "loop1",
        "loop2",
        "loop3",
      ]);
    });
  });
});

describe("resolveDynamicLoopCondition", () => {
  describe("arrange", () => {
    it("should set up test parameters", () => {
      const condition = "{panel.rateYourPurchase} = '5'";
      const panelName = "loop1";
      const currentIndex = 0;

      expect(condition).toBeDefined();
      expect(panelName).toBeDefined();
      expect(currentIndex).toBeDefined();
    });
  });

  describe("act", () => {
    it("should return empty string when condition is empty", () => {
      const result = resolveDynamicLoopCondition("", "loop1", 0);

      expect(result).toBe("");
    });

    it("should return empty string when condition is null", () => {
      const result = resolveDynamicLoopCondition(null as any, "loop1", 0);

      expect(result).toBe("");
    });

    it("should return empty string when condition is undefined", () => {
      const result = resolveDynamicLoopCondition(undefined as any, "loop1", 0);

      expect(result).toBe("");
    });

    it("should replace {panel. with panelName[index]. and resolve the condition", () => {
      const condition = "{panel.rateYourPurchase} = '5'";
      const result = resolveDynamicLoopCondition(condition, "loop1", 0);

      expect(result).toBe("{loop1[0].rateYourPurchase} = '5'");
    });

    it("should handle different panel names", () => {
      const condition = "{panel.question} = true";
      const result = resolveDynamicLoopCondition(condition, "myLoop", 2);

      expect(result).toBe("{myLoop[2].question} = true");
    });

    it("should handle different indices", () => {
      const condition = "{panel.value} > 10";
      const result = resolveDynamicLoopCondition(condition, "loop1", 5);

      expect(result).toBe("{loop1[5].value} > 10");
    });

    it("should handle multiple panel references in the same condition", () => {
      const condition = "{panel.q1} = 1 and {panel.q2} = 2";
      const result = resolveDynamicLoopCondition(condition, "loop1", 3);

      expect(result).toBe("{loop1[3].q1} = 1 and {loop1[3].q2} = 2");
    });

    it("should be case insensitive for {panel.", () => {
      const condition = "{PANEL.something} = 1";
      const result = resolveDynamicLoopCondition(condition, "loop1", 0);

      expect(result).toBe("{loop1[0].something} = 1");
    });

    it("should preserve parts of the condition that are not {panel.", () => {
      const condition = "{panel.q1} = 'yes' and {other.q2} = 'no'";
      const result = resolveDynamicLoopCondition(condition, "loop1", 1);

      expect(result).toBe("{loop1[1].q1} = 'yes' and {other.q2} = 'no'");
    });
  });

  describe("assert", () => {
    it("should correctly resolve complex condition with multiple replacements", () => {
      const condition = "{panel.exitFlag} = true and {panel.rating} > 3";
      const panelName = "purchaseLoop";
      const currentIndex = 4;

      const result = resolveDynamicLoopCondition(
        condition,
        panelName,
        currentIndex,
      );

      expect(result).toBe(
        "{purchaseLoop[4].exitFlag} = true and {purchaseLoop[4].rating} > 3",
      );
    });

    it("should match the documented example", () => {
      const condition = "{panel.rateYourPurchase} = '5'";
      const panelName = "loop1";
      const currentIndex = 0;

      const result = resolveDynamicLoopCondition(
        condition,
        panelName,
        currentIndex,
      );

      expect(result).toBe("{loop1[0].rateYourPurchase} = '5'");
    });
  });
});
