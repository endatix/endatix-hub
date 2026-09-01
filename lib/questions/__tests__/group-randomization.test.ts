import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  Helpers,
  ItemValue,
  SurveyModel,
  QuestionSelectBase,
} from "survey-core";
import addRandomizeGroupFeature from "../features/group-randomization";

// Mock data interfaces
interface GroupedItemValue {
  value: string;
  text: string;
  group?: string;
  randomize?: boolean;
}

describe("Group Randomization Feature", () => {
  describe("Group Randomization Logic", () => {
    beforeEach(() => {
      addRandomizeGroupFeature();
    });

    it("should return empty array for empty input", () => {
      const result = Helpers.randomizeArray([]);
      expect(result).toEqual([]);
    });

    it("should handle null input gracefully", () => {
      const result = Helpers.randomizeArray(
        null as unknown as GroupedItemValue[],
      );
      expect(result).toBeNull();
    });

    it("should use original randomization logic when items have no groups", () => {
      // Arrange
      const items: GroupedItemValue[] = [
        { value: "1", text: "Option 1" },
        { value: "2", text: "Option 2" },
        { value: "3", text: "Option 3" },
      ];
      const originalRandomizeArray = Helpers.randomizeArray;
      const originalSpy = vi.fn().mockImplementation(originalRandomizeArray);
      Helpers.randomizeArray = originalSpy;
      addRandomizeGroupFeature();

      // Act
      const result = Helpers.randomizeArray(items);

      // Assert
      expect(originalSpy).toHaveBeenCalledWith(items);
      expect(result).toHaveLength(3);

      Helpers.randomizeArray = originalRandomizeArray;
    });

    it("should group items by group property", () => {
      // Arrange
      const items: GroupedItemValue[] = [
        { value: "1", text: "Group A Item 1", group: "A" },
        { value: "2", text: "Group B Item 1", group: "B" },
        { value: "3", text: "Group A Item 2", group: "A" },
        { value: "4", text: "No Group", randomize: true },
      ];

      // Act
      const result = Helpers.randomizeArray(items);

      // Assert
      expect(result).toHaveLength(4);
      const groupAItems = result.filter((item) => item.group === "A");
      expect(groupAItems).toHaveLength(2);
      const groupBItems = result.filter((item) => item.group === "B");
      expect(groupBItems).toHaveLength(1);
    });

    it("should preserve group order by first appearance", () => {
      // Arrange
      const items: GroupedItemValue[] = [
        { value: "1", text: "First A", group: "A" },
        { value: "2", text: "First B", group: "B" },
        { value: "3", text: "Second A", group: "A" },
        { value: "4", text: "Second B", group: "B" },
      ];

      // Act
      const result = Helpers.randomizeArray(items);

      // Assert
      const firstAPos = result.findIndex((item) => item.value === "1");
      const firstBPos = result.findIndex((item) => item.value === "2");
      expect(firstAPos).toBeLessThan(firstBPos);
    });

    it("should randomize items within groups when randomize is true", () => {
      // Arrange
      const items: GroupedItemValue[] = [
        { value: "1", text: "Group A Item 1", group: "A", randomize: true },
        { value: "2", text: "Group A Item 2", group: "A", randomize: true },
        { value: "3", text: "Group A Item 3", group: "A", randomize: true },
      ];

      // Act
      const result = Helpers.randomizeArray(items);

      // Assert
      expect(result).toHaveLength(3);
      expect(result.every((item) => item.group === "A")).toBe(true);
    });

    it("should handle items with empty string groups", () => {
      // Arrange
      const items: GroupedItemValue[] = [
        { value: "1", text: "Item 1", group: "" },
        { value: "2", text: "Item 2", group: "" },
        { value: "3", text: "Item 3" },
      ];

      // Act
      const result = Helpers.randomizeArray(items);

      // Assert
      expect(result).toHaveLength(3);
      const emptyGroupItems = result.filter((item) => item.group === "");
      expect(emptyGroupItems).toHaveLength(2);
      const defaultGroupItems = result.filter(
        (item) => item.group === undefined,
      );
      expect(defaultGroupItems).toHaveLength(1);
    });

    it("should handle single item arrays", () => {
      // Arrange
      const items: GroupedItemValue[] = [
        { value: "1", text: "Single Item", group: "A" },
      ];

      // Act
      const result = Helpers.randomizeArray(items);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("1");
    });

    it("should handle mixed groups with different randomize settings", () => {
      // Arrange
      const items: GroupedItemValue[] = [
        { value: "1", text: "Group A Item 1", group: "A", randomize: true },
        { value: "2", text: "Group A Item 2", group: "A", randomize: true },
        { value: "3", text: "Group B Item 1", group: "B", randomize: false },
        { value: "4", text: "Group B Item 2", group: "B", randomize: false },
      ];

      // Act
      const result = Helpers.randomizeArray(items);

      // Assert
      expect(result).toHaveLength(4);

      // Group A items should be randomized (order may vary)
      const groupAItems = result.filter((item) => item.group === "A");
      expect(groupAItems).toHaveLength(2);

      // Group B items should maintain order
      const groupBItems = result.filter((item) => item.group === "B");
      expect(groupBItems).toHaveLength(2);
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      addRandomizeGroupFeature();
    });

    it("should handle items with null/undefined group values", () => {
      // Arrange
      const items: GroupedItemValue[] = [
        { value: "1", text: "Item 1", group: undefined },
        { value: "2", text: "Item 2", group: null as unknown as string },
        { value: "3", text: "Item 3" },
      ];

      // Act
      const result = Helpers.randomizeArray(items);

      // Assert
      expect(result).toHaveLength(3);
    });

    it("should handle items with non-string group values", () => {
      // Arrange
      const items: GroupedItemValue[] = [
        { value: "1", text: "Item 1", group: 123 as unknown as string },
        { value: "2", text: "Item 2", group: {} as unknown as string },
        { value: "3", text: "Item 3" },
      ];

      // Act
      const result = Helpers.randomizeArray(items);

      // Assert
      expect(result).toHaveLength(3);
    });

    it("should handle very large arrays", () => {
      // Arrange
      const items: GroupedItemValue[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          value: i.toString(),
          text: `Item ${i}`,
          group: `Group ${i % 10}`,
          randomize: i % 2 === 0,
        }),
      );

      // Act
      const result = Helpers.randomizeArray(items);

      // Assert
      expect(result).toHaveLength(1000);
      expect(result.every((item) => typeof item.value === "string")).toBe(true);
    });
  });

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

  describe("Integration with Survey JS", () => {
    it("should work with actual SurveyModel", () => {
      // Arrange
      addRandomizeGroupFeature();

      // Act
      const survey = new SurveyModel({
        elements: [
          {
            type: "radiogroup",
            name: "question1",
            choicesOrder: "random",
            choices: [
              { value: "1", text: "Option 1", group: "A" },
              { value: "2", text: "Option 2", group: "B" },
              { value: "3", text: "Option 3", group: "B" },
              { value: "4", text: "Option 4", randomize: false },
              { value: "5", text: "Option 5", group: "A" },
            ],
          },
        ],
      });

      const question = survey.getQuestionByName(
        "question1",
      ) as QuestionSelectBase;
      const choices = question.visibleChoices;

      // Assert
      expect(choices).toHaveLength(5);
      expect(choices.some((choice) => choice.group === "A")).toBe(true);
      expect(choices.some((choice) => choice.group === "B")).toBe(true);
      expect(choices.findIndex((choice) => choice.value === "4")).toEqual(4);
      const randomizedChoicesSignature = choices.map((choice) => choice.group || "__default__").join(",");
      expect(randomizedChoicesSignature).toEqual("A,A,B,B,__default__");
    });
  });

  describe("Design mode", () => {
    type MatrixQuestion = {
      visibleRows: Array<{ cells: Array<{ question: QuestionSelectBase }> }>;
    };

    /**
     * Fixed seeds make "the order never changes" and "the order does change"
     * deterministic assertions instead of coin flips. Four items per group give
     * 24 permutations each, so a shuffle landing back on the authored order for
     * every seed is not a realistic false negative.
     */
    const SEEDS = [11, 22, 33, 44, 55];

    const GROUPED_CHOICES = [
      { value: "item1", group: "A" },
      { value: "item2", group: "A" },
      { value: "item3", group: "A" },
      { value: "item4", group: "A" },
      { value: "item5" },
      { value: "item6", group: "B" },
      { value: "item7", group: "B" },
      { value: "item8", group: "B" },
      { value: "item9", group: "B" },
    ];

    const AUTHORED_ORDER = GROUPED_CHOICES.map((choice) => choice.value);
    const GROUP_SIGNATURE = "A,A,A,A,__default__,B,B,B,B";

    const MATRIX_JSON = {
      elements: [
        {
          type: "matrixdropdown",
          name: "question1",
          rows: ["Row 1", "Row 2"],
          columns: [
            {
              name: "Column 1",
              cellType: "checkbox",
              choicesOrder: "random",
              choices: GROUPED_CHOICES,
            },
          ],
        },
      ],
    };

    const PLAIN_JSON = {
      elements: [
        {
          type: "checkbox",
          name: "question1",
          choicesOrder: "random",
          choices: GROUPED_CHOICES,
        },
      ],
    };

    const createSurvey = (json: object, seed: number, isDesignMode: boolean) => {
      const survey = new SurveyModel();
      if (isDesignMode) {
        survey.setDesignMode(true);
      }
      survey.fromJSON(json);
      survey.randomSeed = seed;
      return survey;
    };

    const getMatrixCell = (survey: SurveyModel): QuestionSelectBase =>
      (survey.getQuestionByName("question1") as unknown as MatrixQuestion)
        .visibleRows[0].cells[0].question;

    const getOrder = (question: QuestionSelectBase): string[] =>
      question.visibleChoices.map((choice) => String(choice.value));

    const getGroupSignature = (choices: ItemValue[]): string =>
      choices.map((choice) => choice.group || "__default__").join(",");

    beforeEach(() => {
      addRandomizeGroupFeature();
    });

    it("should install the design-mode override on QuestionSelectBase", () => {
      // Arrange - the override is what makes the Designer stop shuffling; if
      // survey-core ever renames the method it is silently skipped, so assert
      // it is in place rather than inferring it from ordering alone.
      const randomizeChoices = (
        QuestionSelectBase.prototype as unknown as {
          randomizeArray: (this: unknown, array: ItemValue[]) => ItemValue[];
        }
      ).randomizeArray;
      const items = GROUPED_CHOICES as unknown as ItemValue[];
      const designModeItems = [...items];
      const runtimeItems = [...items];

      // Act
      const inDesignMode = randomizeChoices.call(
        { isDesignMode: true },
        designModeItems,
      );
      const atRuntime = randomizeChoices.call(
        { isDesignMode: false, randomSeed: 12345 },
        runtimeItems,
      );

      // Assert
      expect(inDesignMode).toBe(designModeItems);
      expect(atRuntime).not.toBe(runtimeItems);
      expect(getGroupSignature(atRuntime)).toEqual(GROUP_SIGNATURE);
    });

    it("should keep the authored order for matrix cell choices in design mode", () => {
      // Arrange - matrix cell questions are content elements, so survey-core's
      // own `isInDesignMode` guard does not cover them
      const orders = SEEDS.map((seed) =>
        getOrder(getMatrixCell(createSurvey(MATRIX_JSON, seed, true))),
      );

      // Assert - the seed must make no difference at all in the Designer
      orders.forEach((order) => expect(order).toEqual(AUTHORED_ORDER));
    });

    it("should keep the authored order for standalone choices in design mode", () => {
      // Arrange - design mode appends its own placeholder entries ("", newitem,
      // none, other) whose composition is survey-core's business, so compare
      // the authored values only. A missing or reordered authored value still
      // fails the comparison.
      const orders = SEEDS.map((seed) => {
        const survey = createSurvey(PLAIN_JSON, seed, true);
        const question = survey.getQuestionByName(
          "question1",
        ) as QuestionSelectBase;
        return getOrder(question).filter((value) =>
          AUTHORED_ORDER.includes(value),
        );
      });

      // Assert
      orders.forEach((order) => expect(order).toEqual(AUTHORED_ORDER));
    });

    it("should not reorder matrix cell choices when a group is edited in design mode", () => {
      // Arrange - the original report: the canvas showed a shuffle frozen from
      // before the groups were typed in
      const survey = createSurvey(MATRIX_JSON, SEEDS[0], true);
      const orderOnLoad = getOrder(getMatrixCell(survey));

      // Act
      const templateQuestion = (
        survey.getQuestionByName("question1") as unknown as {
          columns: Array<{ templateQuestion: QuestionSelectBase }>;
        }
      ).columns[0].templateQuestion;
      templateQuestion.choices[4].group = "C";

      // Assert
      expect(orderOnLoad).toEqual(AUTHORED_ORDER);
      expect(getOrder(getMatrixCell(survey))).toEqual(AUTHORED_ORDER);
    });

    it("should still shuffle matrix cell choices within their groups outside design mode", () => {
      // Arrange
      const orders = SEEDS.map((seed) =>
        getMatrixCell(createSurvey(MATRIX_JSON, seed, false)),
      ).map((cell) => ({
        order: getOrder(cell).join(","),
        signature: getGroupSignature(cell.visibleChoices),
      }));

      // Assert - grouping holds, and the choices are genuinely shuffled: the
      // seed changes the order, and the result is not just the authored order
      orders.forEach(({ signature }) =>
        expect(signature).toEqual(GROUP_SIGNATURE),
      );
      expect(new Set(orders.map(({ order }) => order)).size).toBeGreaterThan(1);
      expect(
        orders.some(({ order }) => order !== AUTHORED_ORDER.join(",")),
      ).toBe(true);
    });
  });
});
