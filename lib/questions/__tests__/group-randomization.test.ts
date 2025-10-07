import { describe, expect, it, beforeEach, vi } from "vitest";
import { Helpers, SurveyModel, QuestionSelectBase, ChoiceItem } from "survey-core";
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
});
