import { describe, expect, it, beforeEach } from "vitest";
import { QuestionSelectBase, SurveyModel } from "survey-core";
import addRandomizeGroupFeature from "../features/group-randomization";

describe("Group randomization seeding", () => {
  describe("Stable random seed", () => {
    const NINE_CHOICES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

    const getVisibleOrder = (
      survey: SurveyModel,
      questionName: string,
    ): string =>
      (survey.getQuestionByName(questionName) as QuestionSelectBase).visibleChoices
        .map((choice) => String(choice.value))
        .join(",");

    beforeEach(() => {
      addRandomizeGroupFeature();
    });

    it("should keep the same order for the same survey randomSeed", () => {
      // Arrange
      const survey = new SurveyModel({
        elements: [
          {
            type: "checkbox",
            name: "question1",
            choices: NINE_CHOICES,
            choicesOrder: "random",
          },
        ],
      });

      // Act
      survey.randomSeed = 12345;
      const firstOrder = getVisibleOrder(survey, "question1");
      survey.randomSeed = 123456;
      const otherSeedOrder = getVisibleOrder(survey, "question1");
      survey.randomSeed = 12345;
      const replayedOrder = getVisibleOrder(survey, "question1");

      // Assert
      expect(replayedOrder).toEqual(firstOrder);
      expect(otherSeedOrder).not.toEqual(firstOrder);
    });

    it("should keep the same order for the same randomSeed when items have groups", () => {
      // Arrange
      const groupedChoices = NINE_CHOICES.map((value, index) => ({
        value,
        text: `Option ${value}`,
        group: index % 2 === 0 ? "A" : "B",
      }));
      const survey = new SurveyModel({
        elements: [
          {
            type: "checkbox",
            name: "question1",
            choices: groupedChoices,
            choicesOrder: "random",
          },
        ],
      });

      // Act
      survey.randomSeed = 12345;
      const firstOrder = getVisibleOrder(survey, "question1");
      survey.randomSeed = 123456;
      const otherSeedOrder = getVisibleOrder(survey, "question1");
      survey.randomSeed = 12345;
      const replayedOrder = getVisibleOrder(survey, "question1");

      // Assert
      expect(replayedOrder).toEqual(firstOrder);
      expect(otherSeedOrder).not.toEqual(firstOrder);
    });

    it("should not reshuffle carried-forward choices when the target value changes", () => {
      // Arrange
      const survey = new SurveyModel({
        elements: [
          { type: "checkbox", name: "question1", choices: NINE_CHOICES },
          {
            type: "checkbox",
            name: "question2",
            choicesFromQuestion: "question1",
            choicesFromQuestionMode: "selected",
            choicesOrder: "random",
          },
        ],
      });
      survey.setValue("question1", ["1", "2", "3", "4", "5"]);
      const orderAfterSourceSelection = getVisibleOrder(survey, "question2");

      // Act
      const ordersWhileToggling = [1, 2, 3, 4].map((iteration) => {
        survey.setValue("question2", iteration % 2 === 0 ? ["2"] : []);
        return getVisibleOrder(survey, "question2");
      });

      // Assert
      expect(new Set(ordersWhileToggling)).toEqual(
        new Set([orderAfterSourceSelection]),
      );
    });
  });

  describe("Per-bucket seed", () => {
    const SEEDS = [11, 22, 33, 44, 55, 66];

    const orderOf = (seed: number): string[] => {
      const survey = new SurveyModel({
        elements: [
          {
            type: "radiogroup",
            name: "question1",
            choicesOrder: "random",
            choices: [
              { value: "a1", group: "A" },
              { value: "a2", group: "A" },
              { value: "a3", group: "A" },
              { value: "a4", group: "A" },
              { value: "b1", group: "B" },
              { value: "b2", group: "B" },
              { value: "b3", group: "B" },
              { value: "b4", group: "B" },
            ],
          },
        ],
      });
      survey.randomSeed = seed;
      return (
        survey.getQuestionByName("question1") as QuestionSelectBase
      ).visibleChoices.map((choice) => String(choice.value));
    };

    const patternOf = (order: string[], prefix: string): string =>
      order
        .filter((value) => value.startsWith(prefix))
        .map((value) => value.slice(prefix.length))
        .join(",");

    beforeEach(() => {
      addRandomizeGroupFeature();
    });

    it("should not give two groups of the same size the same permutation", () => {
      // Arrange - one seed shared by every bucket made group B repeat group A's
      // order for every seed, because survey-core seeds a fresh generator per
      // call
      const patterns = SEEDS.map(orderOf).map((order) => [
        patternOf(order, "a"),
        patternOf(order, "b"),
      ]);

      // Assert
      expect(patterns.some(([a, b]) => a !== b)).toBe(true);
    });

    it("should still replay the same order for the same seed", () => {
      // Act & Assert
      expect(orderOf(SEEDS[0])).toEqual(orderOf(SEEDS[0]));
    });
  });
});
