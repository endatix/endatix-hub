import { describe, expect, it } from "vitest";
import { SurveyModel } from "survey-core";
import { isLoopQuestion, getAllLoopQuestions } from "../loop-utils";
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
