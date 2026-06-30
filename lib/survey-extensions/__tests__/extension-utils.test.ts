import { describe, it, expect } from "vitest";
import { createFormAnalyzer, extractQuestionTypes } from "../extension-utils";

describe("createFormAnalyzer", () => {
  describe("null/undefined input", () => {
    it("returns analyzer that always reports false for undefined", () => {
      // Arrange
      const analyzer = createFormAnalyzer(undefined);

      // Act & Assert
      expect(analyzer.formJson).toBeNull();
      expect(analyzer.usesQuestionType("text")).toBe(false);
      expect(analyzer.usesQuestionType("country")).toBe(false);
    });

    it("returns analyzer that always reports false for null", () => {
      // Arrange
      const analyzer = createFormAnalyzer(null);

      // Act & Assert
      expect(analyzer.formJson).toBeNull();
      expect(analyzer.usesQuestionType("text")).toBe(false);
    });
  });

  describe("usesQuestionType", () => {
    it("returns true when form JSON contains the question type (compact)", () => {
      // Arrange
      const form = { pages: [{ elements: [{ type: "country", name: "q1" }] }] };
      const analyzer = createFormAnalyzer(form);

      // Act & Assert
      expect(analyzer.usesQuestionType("country")).toBe(true);
      expect(analyzer.usesQuestionType("text")).toBe(false);
    });

    it("returns true when form is string with compact JSON", () => {
      // Arrange
      const jsonString = '{"pages":[{"elements":[{"type":"hello-world"}]}]}';
      const analyzer = createFormAnalyzer(jsonString);

      // Act & Assert
      expect(analyzer.usesQuestionType("hello-world")).toBe(true);
    });

    it("handles whitespace in JSON (pretty-printed)", () => {
      // Arrange – string with spaces around colons
      const jsonString = '{"pages":[{"elements":[{"type" : "country"}]}]}';
      const analyzer = createFormAnalyzer(jsonString);

      // Act & Assert
      expect(analyzer.usesQuestionType("country")).toBe(true);
    });

    it("returns false for empty string", () => {
      // Arrange
      const analyzer = createFormAnalyzer("");

      // Act & Assert
      expect(analyzer.usesQuestionType("text")).toBe(false);
    });

    it("returns false when type is not present", () => {
      // Arrange
      const form = { pages: [{ elements: [{ type: "text", name: "q1" }] }] };
      const analyzer = createFormAnalyzer(form);

      // Act & Assert
      expect(analyzer.usesQuestionType("country")).toBe(false);
      expect(analyzer.usesQuestionType("hello-world")).toBe(false);
    });

    it("does not match type inside a string value", () => {
      // Arrange – "country" as a title string, not as type
      const form = {
        pages: [{ elements: [{ type: "text", name: "q1", title: "country" }] }],
      };
      const analyzer = createFormAnalyzer(form);

      // Act & Assert – we match "type":"value", so title "country" is not matched
      expect(analyzer.usesQuestionType("text")).toBe(true);
      expect(analyzer.usesQuestionType("country")).toBe(false);
    });
  });

  describe("hasCustomProperty", () => {
    it("returns true when the custom property is present in JSON", () => {
      // Arrange
      const form = {
        pages: [
          {
            elements: [
              {
                type: "tagbox",
                name: "q1",
                edxHideUntilTyping: true,
              },
            ],
          },
        ],
      };
      const analyzer = createFormAnalyzer(form);

      // Act & Assert
      expect(analyzer.hasCustomProperty("edxHideUntilTyping")).toBe(true);
    });

    it("returns false when the custom property is absent", () => {
      // Arrange
      const form = {
        pages: [{ elements: [{ type: "tagbox", name: "q1" }] }],
      };
      const analyzer = createFormAnalyzer(form);

      // Act & Assert
      expect(analyzer.hasCustomProperty("edxHideUntilTyping")).toBe(false);
    });

    it("returns false for null form JSON", () => {
      // Arrange
      const analyzer = createFormAnalyzer(null);

      // Act & Assert
      expect(analyzer.hasCustomProperty("edxHideUntilTyping")).toBe(false);
    });

    it("does not match the property name inside a string value", () => {
      // Arrange
      const form = {
        pages: [
          {
            elements: [
              {
                type: "text",
                name: "q1",
                title: 'Use "edxHideUntilTyping": true in tagbox settings',
              },
            ],
          },
        ],
      };
      const analyzer = createFormAnalyzer(form);

      // Act & Assert
      expect(analyzer.hasCustomProperty("edxHideUntilTyping")).toBe(false);
    });
  });
});

describe("extractQuestionTypes", () => {
  it("returns unique question types from nested structure", () => {
    // Arrange
    const form = {
      pages: [
        {
          elements: [
            { type: "text", name: "q1" },
            { type: "country", name: "q2" },
            { type: "text", name: "q3" },
          ],
        },
      ],
    };

    // Act
    const types = extractQuestionTypes(form);

    // Assert
    expect(types).toHaveLength(2);
    expect(types).toContain("text");
    expect(types).toContain("country");
  });

  it("returns empty array for null or non-object", () => {
    // Act & Assert
    expect(extractQuestionTypes(null)).toEqual([]);
    expect(extractQuestionTypes(undefined)).toEqual([]);
    expect(extractQuestionTypes("string")).toEqual([]);
  });

  it("includes type from root object if present", () => {
    // Arrange
    const form = { type: "panel", elements: [{ type: "text", name: "q1" }] };

    // Act
    const types = extractQuestionTypes(form);

    // Assert
    expect(types).toContain("panel");
    expect(types).toContain("text");
  });

  it("traverses arrays and nested objects", () => {
    // Arrange
    const form = {
      pages: [
        { elements: [{ type: "hello-world" }] },
        { elements: [{ type: "country" }] },
      ],
    };

    // Act
    const types = extractQuestionTypes(form);

    // Assert
    expect(types).toContain("hello-world");
    expect(types).toContain("country");
    expect(types).toHaveLength(2);
  });
});
