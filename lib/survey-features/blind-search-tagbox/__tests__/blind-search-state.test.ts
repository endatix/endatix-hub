import type { Question } from "survey-core";
import { describe, expect, it } from "vitest";
import type { BlindSearchTagboxQuestion } from "../types";
import {
  filterChoicesBySearch,
  isBlindSearchEnabled,
  isBlindSearchTagboxQuestion,
  isSearchThresholdMet,
  shouldEnableOtherFallback,
  shouldSuppressChoices,
} from "../use-cases/blind-search-state";

function createTagboxQuestion(
  overrides: Partial<BlindSearchTagboxQuestion> = {},
): BlindSearchTagboxQuestion {
  return {
    getType: () => "tagbox",
    edxHideUntilTyping: true,
    edxMinSearchLength: 2,
    searchMode: "contains",
    showOtherItem: false,
    ...overrides,
  } as BlindSearchTagboxQuestion;
}

describe("blind-search-state", () => {
  describe("isSearchThresholdMet", () => {
    it("returns false below the minimum length", () => {
      // Act & Assert
      expect(isSearchThresholdMet("a", 2)).toBe(false);
    });

    it("returns true at the minimum length", () => {
      // Act & Assert
      expect(isSearchThresholdMet("ab", 2)).toBe(true);
    });

    it("ignores surrounding whitespace", () => {
      // Act & Assert
      expect(isSearchThresholdMet("  a  ", 1)).toBe(true);
    });
  });

  describe("shouldSuppressChoices", () => {
    it("suppresses when blind search is enabled and threshold is not met", () => {
      // Arrange
      const question = createTagboxQuestion();

      // Act & Assert
      expect(shouldSuppressChoices(question, "a")).toBe(true);
    });

    it("does not suppress when threshold is met", () => {
      // Arrange
      const question = createTagboxQuestion();

      // Act & Assert
      expect(shouldSuppressChoices(question, "ab")).toBe(false);
    });

    it("does not suppress when blind search is disabled", () => {
      // Arrange
      const question = createTagboxQuestion({ edxHideUntilTyping: false });

      // Act & Assert
      expect(shouldSuppressChoices(question, "")).toBe(false);
    });

    it("does not suppress for non-tagbox questions", () => {
      // Arrange
      const question = {
        getType: () => "dropdown",
        edxHideUntilTyping: true,
      } as BlindSearchTagboxQuestion;

      // Act & Assert
      expect(shouldSuppressChoices(question, "")).toBe(false);
    });
  });

  describe("shouldEnableOtherFallback", () => {
    it("enables Other when threshold is met and no choices match", () => {
      // Arrange
      const question = createTagboxQuestion();

      // Act & Assert
      expect(shouldEnableOtherFallback(question, "zz", 0)).toBe(true);
    });

    it("does not enable Other when matches exist", () => {
      // Arrange
      const question = createTagboxQuestion();

      // Act & Assert
      expect(shouldEnableOtherFallback(question, "ab", 1)).toBe(false);
    });

    it("does not enable Other below threshold", () => {
      // Arrange
      const question = createTagboxQuestion();

      // Act & Assert
      expect(shouldEnableOtherFallback(question, "a", 0)).toBe(false);
    });
  });

  describe("filterChoicesBySearch", () => {
    it("filters choices case-insensitively using contains mode", () => {
      // Arrange
      const question = createTagboxQuestion();
      const choices = [
        { value: "1", text: "Alpha" },
        { value: "2", text: "Beta" },
      ];

      // Act
      const filtered = filterChoicesBySearch(question, choices, "AL");

      // Assert
      expect(filtered).toHaveLength(1);
      expect(filtered[0].value).toBe("1");
    });

    it("supports startsWith search mode", () => {
      // Arrange
      const question = createTagboxQuestion({ searchMode: "startsWith" });
      const choices = [
        { value: "1", text: "Alpha" },
        { value: "2", text: "Beta" },
      ];

      // Act
      const filtered = filterChoicesBySearch(question, choices, "ta");

      // Assert
      expect(filtered).toHaveLength(0);
    });
  });

  describe("isBlindSearchEnabled", () => {
    it("returns true only for enabled tagbox questions", () => {
      // Arrange
      const enabled = createTagboxQuestion();
      const disabled = createTagboxQuestion({ edxHideUntilTyping: false });

      // Act & Assert
      expect(isBlindSearchEnabled(enabled)).toBe(true);
      expect(isBlindSearchEnabled(disabled)).toBe(false);
    });
  });

  describe("isBlindSearchTagboxQuestion", () => {
    it.each([
      ["null", null],
      ["undefined", undefined],
    ])("returns false for a %s question rather than throwing", (_, value) => {
      // Arrange
      const question = value as unknown as Question;

      // Act & Assert
      expect(() => isBlindSearchTagboxQuestion(question)).not.toThrow();
      expect(isBlindSearchTagboxQuestion(question)).toBe(false);
      expect(isBlindSearchEnabled(question)).toBe(false);
    });
  });
});
