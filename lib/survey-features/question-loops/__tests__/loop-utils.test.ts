import { describe, expect, it } from "vitest";
import { QuestionSelectBase, SurveyModel } from "survey-core";
import {
  isLoopQuestion,
  getAllLoopQuestions,
  resolveDynamicLoopCondition,
  shuffleArray,
  isNonEmptyCondition,
  isSelectBaseQuestion,
  getAllSelectBasedQuestions,
  getLoopChoicesFromQuestion,
  getAllUniqueChoices,
  extractUniqueChoicesBy,
} from "../loop-utils";
import { DynamicLoopModel, SourceSelectionModes } from "../types";
import { allQuestionsSurveySchema } from "./fixtures/all-questions-survey";
import { sampleLoopSurveySchema } from "./fixtures/sample-loop-survey";

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
  describe("act", () => {
    it("should return true for a question with non-empty loopSource array", () => {
      // arrange
      const survey = createSurvey([
        { name: "loop1", loopSource: ["item1", "item2"] },
      ]);
      const question = survey.getQuestionByName("loop1") as DynamicLoopModel;

      // act
      const result = isLoopQuestion(question);

      // assert
      expect(result).toBe(true);
    });

    it("should return false for a question with empty loopSource array", () => {
      // arrange
      const survey = createSurvey([{ name: "loop1", loopSource: [] }]);
      const question = survey.getQuestionByName("loop1") as DynamicLoopModel;

      // act
      const result = isLoopQuestion(question);

      // assert
      expect(result).toBe(false);
    });

    it("should return false for a regular question without loopSource", () => {
      // arrange
      const survey = createSurvey([], ["regular1"]);
      const question = survey.getQuestionByName("regular1");

      // act
      const result = isLoopQuestion(question);

      // assert
      expect(result).toBe(false);
    });

    it("should return false for a null question", () => {
      // act
      const result = isLoopQuestion(null as any);

      // assert
      expect(result).toBe(false);
    });

    it("should return false for a undefined question", () => {
      // act
      const result = isLoopQuestion(undefined as any);

      // assert
      expect(result).toBe(false);
    });

    it("should return false for a question that is not a paneldynamic type", () => {
      // arrange
      const survey = createSurvey([], ["text1"]);
      const question = survey.getQuestionByName("text1");

      // act
      const result = isLoopQuestion(question);

      // assert
      expect(result).toBe(false);
    });
  });

  describe("assert", () => {
    it("should correctly identify loop questions with valid loopSource", () => {
      // arrange
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

      // act & assert
      expect(isLoopQuestion(loop1)).toBe(true);
      expect(isLoopQuestion(loop2)).toBe(true);
      expect(isLoopQuestion(regular1)).toBe(false);
    });
  });
});

describe("getAllLoopQuestions", () => {
  describe("act", () => {
    it("should return all loop questions from the survey", () => {
      // arrange
      const survey = createSurvey(
        [
          { name: "loop1", loopSource: ["item1"] },
          { name: "loop2", loopSource: ["item2"] },
        ],
        ["text1"],
      );

      // act
      const result = getAllLoopQuestions(survey);

      // assert
      expect(result).toHaveLength(2);
      expect(result.map((q) => q.name)).toEqual(["loop1", "loop2"]);
    });

    it("should return empty array when survey is null", () => {
      // act
      const result = getAllLoopQuestions(null as any);

      // assert
      expect(result).toEqual([]);
    });

    it("should return empty array when survey is undefined", () => {
      // act
      const result = getAllLoopQuestions(undefined as any);

      // assert
      expect(result).toEqual([]);
    });

    it("should return empty array when there are no loop questions", () => {
      // arrange
      const survey = createSurvey([], ["text1", "text2"]);

      // act
      const result = getAllLoopQuestions(survey);

      // assert
      expect(result).toHaveLength(0);
    });

    it("should filter out questions with empty loopSource", () => {
      // arrange
      const survey = createSurvey([
        { name: "loop1", loopSource: ["item1"] },
        { name: "emptyLoop", loopSource: [] },
        { name: "loop2", loopSource: ["item2"] },
      ]);

      // act
      const result = getAllLoopQuestions(survey);

      // assert
      expect(result).toHaveLength(2);
      expect(result.map((q) => q.name)).toEqual(["loop1", "loop2"]);
    });
  });

  describe("assert", () => {
    it("should return correct loop questions in a complex survey", () => {
      // arrange
      const survey = createSurvey(
        [
          { name: "loop1", loopSource: ["a"] },
          { name: "loop2", loopSource: ["b"] },
          { name: "loop3", loopSource: ["c"] },
          { name: "emptyLoop", loopSource: [] },
        ],
        ["text1", "dropdown1"],
      );

      // act
      const result = getAllLoopQuestions(survey);

      // assert
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
  describe("act", () => {
    it("should return empty string when condition is empty", () => {
      // act
      const result = resolveDynamicLoopCondition("", "loop1", 0);

      // assert
      expect(result).toBe("");
    });

    it("should return empty string when condition is null", () => {
      // act
      const result = resolveDynamicLoopCondition(null as any, "loop1", 0);

      // assert
      expect(result).toBe("");
    });

    it("should return empty string when condition is undefined", () => {
      // act
      const result = resolveDynamicLoopCondition(undefined as any, "loop1", 0);

      // assert
      expect(result).toBe("");
    });

    it("should replace {panel. with panelName[index]. and resolve the condition", () => {
      // arrange
      const condition = "{panel.rateYourPurchase} = '5'";

      // act
      const result = resolveDynamicLoopCondition(condition, "loop1", 0);

      // assert
      expect(result).toBe("{loop1[0].rateYourPurchase} = '5'");
    });

    it("should handle different panel names", () => {
      // arrange
      const condition = "{panel.question} = true";

      // act
      const result = resolveDynamicLoopCondition(condition, "myLoop", 2);

      // assert
      expect(result).toBe("{myLoop[2].question} = true");
    });

    it("should handle different indices", () => {
      // arrange
      const condition = "{panel.value} > 10";

      // act
      const result = resolveDynamicLoopCondition(condition, "loop1", 5);

      // assert
      expect(result).toBe("{loop1[5].value} > 10");
    });

    it("should handle multiple panel references in the same condition", () => {
      // arrange
      const condition = "{panel.q1} = 1 and {panel.q2} = 2";

      // act
      const result = resolveDynamicLoopCondition(condition, "loop1", 3);

      // assert
      expect(result).toBe("{loop1[3].q1} = 1 and {loop1[3].q2} = 2");
    });

    it("should be case insensitive for {panel.", () => {
      // arrange
      const condition = "{PANEL.something} = 1";

      // act
      const result = resolveDynamicLoopCondition(condition, "loop1", 0);

      // assert
      expect(result).toBe("{loop1[0].something} = 1");
    });

    it("should preserve parts of the condition that are not {panel.", () => {
      // arrange
      const condition = "{panel.q1} = 'yes' and {other.q2} = 'no'";

      // act
      const result = resolveDynamicLoopCondition(condition, "loop1", 1);

      // assert
      expect(result).toBe("{loop1[1].q1} = 'yes' and {other.q2} = 'no'");
    });
  });

  describe("assert", () => {
    it("should correctly resolve complex condition with multiple replacements", () => {
      // arrange
      const condition = "{panel.exitFlag} = true and {panel.rating} > 3";
      const panelName = "purchaseLoop";
      const currentIndex = 4;

      // act
      const result = resolveDynamicLoopCondition(
        condition,
        panelName,
        currentIndex,
      );

      // assert
      expect(result).toBe(
        "{purchaseLoop[4].exitFlag} = true and {purchaseLoop[4].rating} > 3",
      );
    });

    it("should match the documented example", () => {
      // arrange
      const condition = "{panel.rateYourPurchase} = '5'";
      const panelName = "loop1";
      const currentIndex = 0;

      // act
      const result = resolveDynamicLoopCondition(
        condition,
        panelName,
        currentIndex,
      );

      // assert
      expect(result).toBe("{loop1[0].rateYourPurchase} = '5'");
    });
  });
});

describe("shuffleArray", () => {
  describe("act", () => {
    it("should return empty array when input is empty", () => {
      const result = shuffleArray([]);

      expect(result).toEqual([]);
    });

    it("should return array with same single element", () => {
      const input = [42];
      const result = shuffleArray([...input]);

      expect(result).toHaveLength(1);
      expect(result).toContain(42);
    });

    it("should preserve array length", () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = shuffleArray([...input]);

      expect(result).toHaveLength(input.length);
    });

    it("should contain the same elements (valid permutation)", () => {
      const input = [1, 2, 3, 4, 5];
      const result = shuffleArray([...input]);

      expect(result.sort()).toEqual(input);
    });

    it("should preserve sum of integers", () => {
      const input = [1, 2, 3, 4, 5];
      const originalSum = input.reduce((a, b) => a + b, 0);
      const result = shuffleArray([...input]);
      const resultSum = result.reduce((a, b) => a + b, 0);

      expect(resultSum).toBe(originalSum);
    });

    it("should mutate the original array", () => {
      const input = [1, 2, 3, 4, 5];
      shuffleArray(input);

      expect(input).toHaveLength(5);
    });

    it("should handle array of strings", () => {
      const input = ["apple", "banana", "cherry", "date"];
      const result = shuffleArray([...input]);

      expect(result.sort()).toEqual(input.sort());
    });

    it("should handle objects", () => {
      const input = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = shuffleArray([...input]);

      expect(result.length).toBe(3);
      expect(result.map((r) => r.id).sort()).toEqual([1, 2, 3]);
    });
  });

  describe("assert", () => {
    it("should produce different orders on multiple shuffles (statistical test)", () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const results: number[][] = [];

      for (let i = 0; i < 50; i++) {
        results.push(shuffleArray([...input]));
      }

      const firstElements = results.map((r) => r[0]);
      const uniqueFirstElements = new Set(firstElements);

      expect(uniqueFirstElements.size).toBeGreaterThan(1);
    });

    it("should eventually produce different permutations over many runs", () => {
      const input = [1, 2, 3];
      const permutations = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const result = shuffleArray([...input]);
        permutations.add(result.join(","));
      }

      expect(permutations.size).toBeGreaterThan(1);
    });
  });
});

describe("isNonEmptyCondition", () => {
  describe("act", () => {
    it("should return true for non-empty string condition", () => {
      const result = isNonEmptyCondition("{panel.value} = 'test'");

      expect(result).toBe(true);
    });

    it("should return true for condition with only whitespace (treated as empty after trim)", () => {
      const result = isNonEmptyCondition("   ");

      expect(result).toBe(false);
    });

    it("should return false for empty string", () => {
      const result = isNonEmptyCondition("");

      expect(result).toBe(false);
    });

    it("should return false for undefined", () => {
      const result = isNonEmptyCondition(undefined);

      expect(result).toBe(false);
    });

    it("should return false for null", () => {
      const result = isNonEmptyCondition(null as any);

      expect(result).toBe(false);
    });

    it("should return true for condition with leading and trailing whitespace", () => {
      const result = isNonEmptyCondition("  {panel.value} = 'test'  ");

      expect(result).toBe(true);
    });

    it("should return false for number type", () => {
      const result = isNonEmptyCondition(123 as any);

      expect(result).toBe(false);
    });

    it("should return false for object type", () => {
      const result = isNonEmptyCondition({ value: "test" } as any);

      expect(result).toBe(false);
    });
  });

  describe("assert", () => {
    it("should work as type guard for conditional logic", () => {
      const conditions: (string | undefined)[] = [
        "{panel.q1} = 1",
        "",
        undefined,
        "  ",
        "{panel.q2} > 5",
      ];

      const nonEmptyConditions = conditions.filter(isNonEmptyCondition);

      expect(nonEmptyConditions).toHaveLength(2);
      expect(nonEmptyConditions).toEqual(["{panel.q1} = 1", "{panel.q2} > 5"]);
    });

    it("should correctly identify SurveyJS visibility conditions", () => {
      const validCondition = "{panel.exitFlag} = true";
      const emptyCondition = "";
      const whitespaceCondition = "   ";

      expect(isNonEmptyCondition(validCondition)).toBe(true);
      expect(isNonEmptyCondition(emptyCondition)).toBe(false);
      expect(isNonEmptyCondition(whitespaceCondition)).toBe(false);
    });
  });
});

describe("isSelectBaseQuestion", () => {
  it("should return true for checkbox question", () => {
    // arrange
    const survey = new SurveyModel(allQuestionsSurveySchema as any);
    const checkbox = survey.getQuestionByName("q_checkbox");
    expect(checkbox).toBeDefined();

    // act
    const result = isSelectBaseQuestion(checkbox);

    // assert
    expect(result).toBe(true);
  });

  it("should return true for radiogroup question", () => {
    // arrange
    const survey = new SurveyModel(allQuestionsSurveySchema as any);
    const radiogroup = survey.getQuestionByName("q_radiogroup");
    expect(radiogroup).toBeDefined();

    // act
    const result = isSelectBaseQuestion(radiogroup);

    // assert
    expect(result).toBe(true);
  });

  it("should return true for dropdown question", () => {
    // arrange
    const survey = new SurveyModel(allQuestionsSurveySchema as any);
    const dropdown = survey.getQuestionByName("q_dropdown");
    expect(dropdown).toBeDefined();

    // act
    const result = isSelectBaseQuestion(dropdown);

    // assert
    expect(result).toBe(true);
  });

  it("should return true for tagbox question", () => {
    // arrange
    const survey = new SurveyModel(allQuestionsSurveySchema as any);
    const tagbox = survey.getQuestionByName("q_tagbox");
    expect(tagbox).toBeDefined();

    // act
    const result = isSelectBaseQuestion(tagbox);

    // assert
    expect(result).toBe(true);
  });

  it("should return true for imagepicker question", () => {
    // arrange
    const survey = new SurveyModel(allQuestionsSurveySchema as any);
    const imagepicker = survey.getQuestionByName("q_imagepicker");
    expect(imagepicker).toBeDefined();

    // act
    const result = isSelectBaseQuestion(imagepicker);

    // assert
    expect(result).toBe(true);
  });

  it("should return true for ranking question", () => {
    // arrange
    const survey = new SurveyModel(allQuestionsSurveySchema as any);
    const ranking = survey.getQuestionByName("q_ranking");
    expect(ranking).toBeDefined();

    // act
    const result = isSelectBaseQuestion(ranking);

    // assert
    expect(result).toBe(true);
  });

  it("should return true for buttongroup question", () => {
    // arrange
    const survey = new SurveyModel(allQuestionsSurveySchema as any);
    const buttongroup = survey.getQuestionByName("q_buttongroup");
    expect(buttongroup).toBeDefined();

    // act
    const result = isSelectBaseQuestion(buttongroup);

    // assert
    expect(result).toBe(true);
  });

  it("should return false for text question", () => {
    // arrange
    const survey = new SurveyModel(allQuestionsSurveySchema as any);
    const text = survey.getQuestionByName("q_text");
    expect(text).toBeDefined();

    // act
    const result = isSelectBaseQuestion(text);

    // assert
    expect(result).toBe(false);
  });

  it("should return false for rating question", () => {
    // arrange
    const survey = new SurveyModel(allQuestionsSurveySchema as any);
    const rating = survey.getQuestionByName("q_rating");
    expect(rating).toBeDefined();

    // act
    const result = isSelectBaseQuestion(rating);

    // assert
    expect(result).toBe(false);
  });

  it("should return false for matrix question", () => {
    // arrange
    const survey = new SurveyModel(allQuestionsSurveySchema as any);
    const matrix = survey.getQuestionByName("q_matrix");
    expect(matrix).toBeDefined();

    // act
    const result = isSelectBaseQuestion(matrix);

    // assert
    expect(result).toBe(false);
  });

  it("should return false for null question", () => {
    // act
    const result = isSelectBaseQuestion(null as any);

    // assert
    expect(result).toBe(false);
  });

  it("should correctly identify all select-based questions in sample survey", () => {
    // arrange
    const survey = new SurveyModel(allQuestionsSurveySchema as any);

    // act
    const selectBasedQuestions = survey
      .getAllQuestions()
      .filter(isSelectBaseQuestion);

    // assert
    const expectedTypes = [
      "checkbox",
      "radiogroup",
      "dropdown",
      "tagbox",
      "imagepicker",
      "ranking",
      "buttongroup",
    ];
    const actualTypes = selectBasedQuestions.map((q) => q.getType());

    expectedTypes.forEach((type) => {
      expect(actualTypes).toContain(type);
    });
  });
});

describe("getAllSelectBasedQuestions", () => {
  it("should return empty array when survey is null", () => {
    // act
    const result = getAllSelectBasedQuestions(null as any);

    // assert
    expect(result).toEqual([]);
  });

  it("should return empty array when survey is undefined", () => {
    // act
    const result = getAllSelectBasedQuestions(undefined as any);

    // assert
    expect(result).toEqual([]);
  });

  it("should return all select-based questions from sample loop survey", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);

    // act
    const result = getAllSelectBasedQuestions(survey);

    // assert
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("brands");
  });

  it("should return all select-based questions from all-questions survey", () => {
    // arrange
    const survey = new SurveyModel(allQuestionsSurveySchema as any);

    // act
    const result = getAllSelectBasedQuestions(survey);

    // assert
    expect(result.length).toBeGreaterThanOrEqual(7);
  });

  it("should return correct question names from sample loop survey", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);

    // act
    const result = getAllSelectBasedQuestions(survey);

    // assert
    const names = result.map((q) => q.name);
    expect(names).toContain("brands");
  });
});

describe("getLoopChoicesFromQuestion", () => {
  it("should return all choices when selection mode is All", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const brands = survey.getQuestionByName("brands");

    // act
    const result = getLoopChoicesFromQuestion(brands, SourceSelectionModes.All);

    // assert
    expect(result.length).toBe(5);
  });

  it("should return empty array when no value is selected and mode is SelectedOnly", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const brands = survey.getQuestionByName("brands");

    // act
    const result = getLoopChoicesFromQuestion(
      brands,
      SourceSelectionModes.SelectedOnly,
    );

    // assert
    expect(result).toEqual([]);
  });

  it("should return selected choices when mode is SelectedOnly", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const brands = survey.getQuestionByName("brands");
    brands.value = ["kia", "toyota"];

    // act
    const result = getLoopChoicesFromQuestion(
      brands,
      SourceSelectionModes.SelectedOnly,
    );

    // assert
    expect(result.length).toBe(2);
    const values = result.map((c) => c.value);
    expect(values).toContain("kia");
    expect(values).toContain("toyota");
  });

  it("should return unselected choices when mode is UnselectedOnly", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const brands = survey.getQuestionByName("brands");
    brands.value = ["kia", "toyota"];

    // act
    const result = getLoopChoicesFromQuestion(
      brands,
      SourceSelectionModes.UnselectedOnly,
    );

    // assert
    expect(result.length).toBe(3);
    const values = result.map((c) => c.value);
    expect(values).toContain("huyndai");
    expect(values).toContain("honda");
    expect(values).toContain("nissan");
  });

  it("should return empty array for unknown selection mode", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const brands = survey.getQuestionByName("brands");

    // act
    const result = getLoopChoicesFromQuestion(brands, "Unknown Mode" as any);

    // assert
    expect(result).toEqual([]);
  });

  it("should handle question with no choices property", () => {
    // arrange
    const survey = new SurveyModel({
      elements: [{ type: "text", name: "text1" }],
    });
    const textQ = survey.getQuestionByName("text1");

    // act
    const result = getLoopChoicesFromQuestion(textQ, SourceSelectionModes.All);

    // assert
    expect(result).toEqual([]);
  });

  it("should handle single value (not array) when mode is SelectedOnly", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const brands = survey.getQuestionByName("brands");
    brands.value = "kia";

    // act
    const result = getLoopChoicesFromQuestion(
      brands,
      SourceSelectionModes.SelectedOnly,
    );

    // assert
    expect(result.length).toBe(1);
    expect(result[0].value).toBe("kia");
  });

  it("should return correct choices for sample loop survey brands", () => {
    // arrange
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const brands = survey.getQuestionByName("brands");

    // act
    const allChoices = getLoopChoicesFromQuestion(
      brands,
      SourceSelectionModes.All,
    );
    const allValues = allChoices.map((c) => c.value);

    // assert
    expect(allValues).toEqual(["kia", "huyndai", "honda", "toyota", "nissan"]);
  });
});

describe("getAllUniqueChoices", () => {
  it("should return empty array for empty input", () => {
    const result = getAllUniqueChoices([]);
    expect(result).toEqual([]);
  });

  it("should extract unique choices from multiple questions", () => {
    const survey = new SurveyModel(allQuestionsSurveySchema as any);
    const selectQuestions = getAllSelectBasedQuestions(survey);
    const result = getAllUniqueChoices(selectQuestions);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should not include duplicate choice values across questions", () => {
    const survey = new SurveyModel(allQuestionsSurveySchema as any);
    const selectQuestions = getAllSelectBasedQuestions(survey);
    const result = getAllUniqueChoices(selectQuestions);
    const uniqueValues = new Set(result.map((c) => c.value));
    expect(uniqueValues.size).toBe(result.length);
  });

  it("should use choice text from original choice when no formatter provided", () => {
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const brands = survey.getQuestionByName("brands") as QuestionSelectBase;
    const choices = getAllUniqueChoices([brands]);
    expect(choices.length).toBe(5);
    expect(choices[0].text).toBe("Kia");
    expect(choices[1].text).toBe("Huyndai");
  });

  it("should use custom formatter when provided", () => {
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const brands = survey.getQuestionByName("brands") as QuestionSelectBase;
    const choices = getAllUniqueChoices(
      [brands],
      (q, c) => `${q.name}: ${c.value}`,
    );
    expect(choices.length).toBe(5);
    expect(choices[0].text).toBe("brands: kia");
    expect(choices[1].text).toBe("brands: huyndai");
  });

  it("should correctly extract unique choices from sample loop survey brands", () => {
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const brands = survey.getQuestionByName("brands") as QuestionSelectBase;
    const choices = getAllUniqueChoices([brands]);
    expect(choices.length).toBe(5);
    const sortedChoices = choices.map((c) => c.value).sort();
    expect(sortedChoices).toEqual([
      "honda",
      "huyndai",
      "kia",
      "nissan",
      "toyota",
    ]);
  });

  it("should preserve choice value when using custom formatter", () => {
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const brands = survey.getQuestionByName("brands") as QuestionSelectBase;
    const choices = getAllUniqueChoices([brands], () => "custom text");
    choices.forEach((choice) => {
      expect(choice.value).toBeDefined();
      expect(choice.text).toBe("custom text");
    });
  });

  it("should correctly extract unique choices from all questions fixture", () => {
    const survey = new SurveyModel(allQuestionsSurveySchema as any);
    const selectQuestions = getAllSelectBasedQuestions(survey);
    const allChoices = selectQuestions.flatMap((q) => q.choices);
    const choices = getAllUniqueChoices(selectQuestions);
    const valueSet = new Set(choices.map((c) => c.value));
    const isEveryChoicePresent = allChoices.every((choice) =>
      valueSet.has(choice.value),
    );
    expect(valueSet.size, "each choice value is unique").toBe(choices.length);
    expect(isEveryChoicePresent, "every choice present in unique choices").toBe(
      true,
    );
  });
});

describe("extractUniqueChoicesBy (integration with fixtures)", () => {
  it("should deduplicate by value when using choices selector across all-questions survey", () => {
    const survey = new SurveyModel(allQuestionsSurveySchema as any);
    const selectQuestions = getAllSelectBasedQuestions(survey);
    const choices = extractUniqueChoicesBy(selectQuestions, (q) => q.choices);
    const values = choices.map((c) => c.value);
    expect(new Set(values).size).toBe(choices.length);
  });

  it("should return unique choices from sample loop survey when using choices selector", () => {
    const survey = new SurveyModel(sampleLoopSurveySchema as any);
    const brands = survey.getQuestionByName("brands") as QuestionSelectBase;
    const choices = extractUniqueChoicesBy([brands], (q) => q.choices);
    expect(choices.map((c) => c.value).sort()).toEqual([
      "honda",
      "huyndai",
      "kia",
      "nissan",
      "toyota",
    ]);
  });
});
