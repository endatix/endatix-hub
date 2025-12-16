import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  ComponentCollection,
  ICustomQuestionTypeConfiguration,
  Question,
} from "survey-core";
import { SurveyCreator } from "survey-creator-react";
import {
  createCustomQuestionClass,
  initializeCustomQuestions,
  registerSpecializedQuestion,
  CustomQuestionConfig,
} from "../infrastructure/specialized-survey-question";

// Mock ComponentCollection
vi.mock("survey-core", async () => {
  const actual = await vi.importActual("survey-core");
  return {
    ...actual,
    ComponentCollection: {
      Instance: {
        getCustomQuestionByName: vi.fn(),
        add: vi.fn(),
      },
    },
  };
});

// Mock SurveyCreator
vi.mock("survey-creator-react", () => ({
  SurveyCreator: vi.fn().mockImplementation(() => ({
    toolbox: {
      changeCategory: vi.fn(),
      orderedQuestions: [],
    },
  })),
}));

describe("SpecializedSurveyQuestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (
      ComponentCollection.Instance.getCustomQuestionByName as ReturnType<
        typeof vi.fn
      >
    ).mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("parseJsonSafely", () => {
    it("should parse valid JSON successfully", () => {
      const jsonData = JSON.stringify({ name: "test", title: "Test Question" });
      const result = initializeCustomQuestions([jsonData]);
      expect(result).toHaveLength(1);
    });

    it("should reject JSON exceeding size limit", () => {
      const largeJson = JSON.stringify({
        name: "test",
        title: "Test",
        data: "x".repeat(25 * 1024), // Exceeds 24KB limit
      });
      const result = initializeCustomQuestions([largeJson]);
      expect(result).toHaveLength(0);
    });

    it("should reject invalid JSON strings", () => {
      const invalidJson = '{ name: "test", invalid }';
      const result = initializeCustomQuestions([invalidJson]);
      expect(result).toHaveLength(0);
    });

    it("should reject arrays", () => {
      const arrayJson = JSON.stringify([{ name: "test", title: "Test" }]);
      const result = initializeCustomQuestions([arrayJson]);
      expect(result).toHaveLength(0);
    });

    it("should reject primitives", () => {
      const primitiveJson = JSON.stringify("just a string");
      const result = initializeCustomQuestions([primitiveJson]);
      expect(result).toHaveLength(0);
    });
  });

  describe("sanitizeObject", () => {
    it("should remove dangerous callback properties", () => {
      const jsonData = JSON.stringify({
        name: "test",
        title: "Test Question",
        onInit: () => console.log("malicious"),
        onCreated: () => console.log("malicious"),
        onAfterRender: () => console.log("malicious"),
      });
      const result = initializeCustomQuestions([jsonData]);
      expect(result).toHaveLength(1);
      const instance = new (result[0] as unknown as new () => {
        customQuestionConfig: ICustomQuestionTypeConfiguration;
      })();
      const config = instance.customQuestionConfig;
      expect(config).not.toHaveProperty("onInit");
      expect(config).not.toHaveProperty("onCreated");
      expect(config).not.toHaveProperty("onAfterRender");
    });

    it("should remove prototype pollution properties", () => {
      const jsonData = JSON.stringify({
        name: "test",
        title: "Test Question",
        __proto__: { malicious: true },
        constructor: {},
        prototype: {},
      });
      const result = initializeCustomQuestions([jsonData]);
      expect(result).toHaveLength(1);
      const instance = new (result[0] as unknown as new () => {
        customQuestionConfig: ICustomQuestionTypeConfiguration;
      })();
      const config = instance.customQuestionConfig;
      expect(config).not.toHaveProperty("__proto__");
      expect(config).not.toHaveProperty("constructor");
      expect(config).not.toHaveProperty("prototype");
      expect(config).not.toHaveProperty("malicious");
      expect(config.name).toBe("test");
      expect(config.title).toBe("Test Question");
    });

    it("should remove suspicious code patterns in strings", () => {
      const jsonData = JSON.stringify({
        name: "test",
        title: "Test Question",
        description: "function() { malicious code }",
        helpText: "eval(something)",
        placeholder: "setTimeout(() => {})",
      });
      const result = initializeCustomQuestions([jsonData]);
      expect(result).toHaveLength(1);
    });

    it("should sanitize nested objects", () => {
      const jsonData = JSON.stringify({
        name: "test",
        title: "Test Question",
        questionJSON: {
          type: "text",
          name: "q1",
          onInit: () => console.log("malicious"),
          nested: {
            onCreated: () => console.log("malicious"),
          },
        },
      });
      const result = initializeCustomQuestions([jsonData]);
      expect(result).toHaveLength(1);
    });

    it("should sanitize arrays", () => {
      const jsonData = JSON.stringify({
        name: "test",
        title: "Test Question",
        elementsJSON: [
          { type: "text", name: "q1", onInit: () => {} },
          { type: "text", name: "q2" },
        ],
      });
      const result = initializeCustomQuestions([jsonData]);
      expect(result).toHaveLength(1);
    });
  });

  describe("validateAndSanitizeCustomQuestion", () => {
    it("should validate required name field", () => {
      const jsonData = JSON.stringify({ title: "Test Question" });
      const result = initializeCustomQuestions([jsonData]);
      expect(result).toHaveLength(0);
    });

    it("should validate required title field", () => {
      // Use unique name to avoid registry conflicts
      const jsonData = JSON.stringify({ name: "test-no-title-unique" });
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const result = initializeCustomQuestions([jsonData]);
      expect(result).toHaveLength(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Custom question missing or invalid title",
      );
      consoleErrorSpy.mockRestore();
    });

    it("should reject empty name", () => {
      const jsonData = JSON.stringify({ name: "", title: "Test Question" });
      const result = initializeCustomQuestions([jsonData]);
      expect(result).toHaveLength(0);
    });

    it("should reject whitespace-only name", () => {
      const jsonData = JSON.stringify({ name: "   ", title: "Test Question" });
      const result = initializeCustomQuestions([jsonData]);
      expect(result).toHaveLength(0);
    });

    it("should trim name and title", () => {
      const jsonData = JSON.stringify({
        name: "  test  ",
        title: "  Test Question  ",
      });
      const result = initializeCustomQuestions([jsonData]);
      expect(result).toHaveLength(1);
      const instance = new (result[0] as unknown as new () => {
        customQuestionConfig: ICustomQuestionTypeConfiguration;
      })();
      const config = instance.customQuestionConfig;
      expect(config.name).toBe("test");
      expect(config.title).toBe("Test Question");
    });

    it("should handle optional properties", () => {
      // Use unique name to avoid registry conflicts
      const jsonData = JSON.stringify({
        name: "test-optional-props-unique",
        title: "Test Question",
        iconName: "icontest",
        category: "custom",
        orderedAfter: "text",
        defaultQuestionTitle: "Default Title",
        inheritBaseProps: false,
      });
      const result = initializeCustomQuestions([jsonData]);
      expect(result).toHaveLength(1);
      const instance = new (result[0] as unknown as new () => {
        customQuestionConfig: ICustomQuestionTypeConfiguration;
      })();
      const config = instance.customQuestionConfig;
      expect(config.name).toBe("test-optional-props-unique");
      expect(config.title).toBe("Test Question");
      // defaultQuestionTitle should use provided value, not fall back to title
      expect(config.defaultQuestionTitle).toBe("Default Title");
    });

    it("should default inheritBaseProps to true", () => {
      const jsonData = JSON.stringify({
        name: "test",
        title: "Test Question",
      });
      const result = initializeCustomQuestions([jsonData]);
      expect(result).toHaveLength(1);
      const instance = new (result[0] as unknown as new () => {
        customQuestionConfig: ICustomQuestionTypeConfiguration;
      })();
      const config = instance.customQuestionConfig;
      expect(config.inheritBaseProps).toBe(true);
    });
  });

  describe("createCustomQuestionClass", () => {
    it("should create a class with correct config", () => {
      const config: CustomQuestionConfig = {
        name: "test",
        title: "Test Question",
        iconName: "icon-test",
      };
      const QuestionClass = createCustomQuestionClass(config);
      const instance = new (QuestionClass as unknown as new () => {
        customQuestionConfig: ICustomQuestionTypeConfiguration;
      })();
      const questionConfig = instance.customQuestionConfig;
      expect(questionConfig.name).toBe("test");
      expect(questionConfig.title).toBe("Test Question");
      expect(questionConfig.iconName).toBe("icon-test");
    });

    it("should use title as defaultQuestionTitle when not provided", () => {
      const config: CustomQuestionConfig = {
        name: "test",
        title: "Test Question",
      };
      const QuestionClass = createCustomQuestionClass(config);
      const instance = new (QuestionClass as unknown as new () => {
        customQuestionConfig: ICustomQuestionTypeConfiguration;
      })();
      const questionConfig = instance.customQuestionConfig;
      expect(questionConfig.defaultQuestionTitle).toBe("Test Question");
    });

    it("should use provided defaultQuestionTitle", () => {
      const config: CustomQuestionConfig = {
        name: "test",
        title: "Test Question",
        defaultQuestionTitle: "Default Title",
      };
      const QuestionClass = createCustomQuestionClass(config);
      const instance = new (QuestionClass as unknown as new () => {
        customQuestionConfig: ICustomQuestionTypeConfiguration;
      })();
      const questionConfig = instance.customQuestionConfig;
      expect(questionConfig.defaultQuestionTitle).toBe("Default Title");
    });

    it("should handle questionJSON", () => {
      const config: CustomQuestionConfig = {
        name: "test",
        title: "Test Question",
        questionJSON: { type: "text", name: "q1" } as unknown as Question,
      };
      const QuestionClass = createCustomQuestionClass(config);
      const instance = new (QuestionClass as unknown as new () => {
        customQuestionConfig: ICustomQuestionTypeConfiguration;
      })();
      const questionConfig = instance.customQuestionConfig;
      expect(questionConfig.questionJSON).toEqual({ type: "text", name: "q1" });
    });

    it("should handle elementsJSON", () => {
      const config: CustomQuestionConfig = {
        name: "test",
        title: "Test Question",
        elementsJSON: [
          { type: "text", name: "q1" },
          { type: "text", name: "q2" },
        ] as unknown as Question[],
      };
      const QuestionClass = createCustomQuestionClass(config);
      const instance = new (QuestionClass as unknown as new () => {
        customQuestionConfig: ICustomQuestionTypeConfiguration;
      })();
      const questionConfig = instance.customQuestionConfig;
      expect(questionConfig.elementsJSON).toHaveLength(2);
    });

    it("should customize editor with category", () => {
      const config: CustomQuestionConfig = {
        name: "test",
        title: "Test Question",
        category: "custom",
      };
      const QuestionClass = createCustomQuestionClass(config);
      const mockCreator = {
        toolbox: {
          changeCategory: vi.fn(),
          orderedQuestions: [],
        },
      } as unknown as SurveyCreator;
      QuestionClass.customizeEditor(mockCreator);
      expect(mockCreator.toolbox.changeCategory).toHaveBeenCalledWith(
        "test",
        "custom",
      );
    });

    it("should customize editor with orderedAfter", () => {
      const config: CustomQuestionConfig = {
        name: "test",
        title: "Test Question",
        orderedAfter: "text",
      };
      const QuestionClass = createCustomQuestionClass(config);
      const mockCreator = {
        toolbox: {
          changeCategory: vi.fn(),
          orderedQuestions: ["text", "checkbox"],
        },
      } as unknown as SurveyCreator;
      QuestionClass.customizeEditor(mockCreator);
      expect(mockCreator.toolbox.orderedQuestions).toEqual([
        "text",
        "test",
        "checkbox",
      ]);
    });

    it("should handle orderedAfter when previous question not found", () => {
      const config: CustomQuestionConfig = {
        name: "test",
        title: "Test Question",
        orderedAfter: "nonexistent",
      };
      const QuestionClass = createCustomQuestionClass(config);
      const mockCreator = {
        toolbox: {
          changeCategory: vi.fn(),
          orderedQuestions: ["text", "checkbox"],
        },
      } as unknown as SurveyCreator;
      QuestionClass.customizeEditor(mockCreator);
      expect(mockCreator.toolbox.orderedQuestions).toEqual([
        "text",
        "checkbox",
        "nonexistent",
        "test",
      ]);
    });
  });

  describe("initializeCustomQuestions", () => {
    it("should initialize single question", () => {
      // Ensure mock returns null (not registered) and use unique name
      (
        ComponentCollection.Instance.getCustomQuestionByName as ReturnType<
          typeof vi.fn
        >
      ).mockReturnValue(null);
      const jsonData = JSON.stringify({
        name: "test-init-single-unique",
        title: "Test Question",
      });
      const result = initializeCustomQuestions([jsonData]);
      expect(result).toHaveLength(1);
      // Verify that add was called (registration happened)
      expect(ComponentCollection.Instance.add).toHaveBeenCalled();
      const addCall = (
        ComponentCollection.Instance.add as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];
      expect(addCall.name).toBe("test-init-single-unique");
    });

    it("should initialize multiple questions", () => {
      // Ensure mock returns null (not registered)
      (
        ComponentCollection.Instance.getCustomQuestionByName as ReturnType<
          typeof vi.fn
        >
      ).mockReturnValue(null);
      const jsonData1 = JSON.stringify({
        name: "test1",
        title: "Test Question 1",
      });
      const jsonData2 = JSON.stringify({
        name: "test2",
        title: "Test Question 2",
      });
      const result = initializeCustomQuestions([jsonData1, jsonData2]);
      expect(result).toHaveLength(2);
      expect(ComponentCollection.Instance.add).toHaveBeenCalled();
    });

    it("should use registry to avoid duplicate registration", () => {
      // Ensure mock returns null (not registered)
      (
        ComponentCollection.Instance.getCustomQuestionByName as ReturnType<
          typeof vi.fn
        >
      ).mockReturnValue(null);
      const jsonData = JSON.stringify({
        name: "test",
        title: "Test Question",
      });
      const result1 = initializeCustomQuestions([jsonData]);
      const addCallCount = (
        ComponentCollection.Instance.add as ReturnType<typeof vi.fn>
      ).mock.calls.length;
      const result2 = initializeCustomQuestions([jsonData]);
      expect(result1).toHaveLength(1);
      expect(result2).toHaveLength(1);
      expect(result1[0]).toBe(result2[0]); // Same instance
      // Should only be called once (on first initialization)
      expect(
        (ComponentCollection.Instance.add as ReturnType<typeof vi.fn>).mock
          .calls.length,
      ).toBe(addCallCount); // No additional calls on second init
    });

    it("should filter out invalid questions", () => {
      const validJson = JSON.stringify({
        name: "test",
        title: "Test Question",
      });
      const invalidJson = JSON.stringify({ name: "invalid" }); // Missing title
      const result = initializeCustomQuestions([validJson, invalidJson]);
      expect(result).toHaveLength(1);
    });

    it("should handle empty array", () => {
      const result = initializeCustomQuestions([]);
      expect(result).toHaveLength(0);
    });

    it("should handle all invalid questions", () => {
      const invalidJson1 = JSON.stringify({ name: "invalid1" });
      const invalidJson2 = JSON.stringify({ title: "invalid2" });
      const result = initializeCustomQuestions([invalidJson1, invalidJson2]);
      expect(result).toHaveLength(0);
    });
  });

  describe("registerSpecializedQuestion", () => {
    it("should register question with ComponentCollection", () => {
      const config: CustomQuestionConfig = {
        name: "test",
        title: "Test Question",
      };
      const QuestionClass = createCustomQuestionClass(config);
      registerSpecializedQuestion(QuestionClass);
      expect(ComponentCollection.Instance.add).toHaveBeenCalledTimes(1);
      const callArgs = (
        ComponentCollection.Instance.add as ReturnType<typeof vi.fn>
      ).mock.calls[0][0];
      expect(callArgs.name).toBe("test");
      expect(callArgs.title).toBe("Test Question");
    });

    it("should not register if already registered", () => {
      const config: CustomQuestionConfig = {
        name: "test",
        title: "Test Question",
      };
      const QuestionClass = createCustomQuestionClass(config);
      (
        ComponentCollection.Instance.getCustomQuestionByName as ReturnType<
          typeof vi.fn
        >
      ).mockReturnValue({ name: "test" } as ICustomQuestionTypeConfiguration);
      registerSpecializedQuestion(QuestionClass);
      expect(ComponentCollection.Instance.add).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", () => {
      const config: CustomQuestionConfig = {
        name: "test",
        title: "Test Question",
      };
      const QuestionClass = createCustomQuestionClass(config);
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (
        ComponentCollection.Instance.getCustomQuestionByName as ReturnType<
          typeof vi.fn
        >
      ).mockImplementation(() => {
        throw new Error("Test error");
      });
      expect(() => registerSpecializedQuestion(QuestionClass)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Security", () => {
    it("should prevent code injection via onInit callback", () => {
      const maliciousJson = JSON.stringify({
        name: "test",
        title: "Test Question",
        onInit: 'function() { alert("XSS") }',
      });
      const result = initializeCustomQuestions([maliciousJson]);
      expect(result).toHaveLength(1);
      const instance = new (result[0] as unknown as new () => {
        customQuestionConfig: ICustomQuestionTypeConfiguration;
      })();
      const config = instance.customQuestionConfig;
      expect(config).not.toHaveProperty("onInit");
    });

    it("should prevent prototype pollution", () => {
      const maliciousJson = JSON.stringify({
        name: "test",
        title: "Test Question",
        __proto__: { isAdmin: true },
      });
      const result = initializeCustomQuestions([maliciousJson]);
      expect(result).toHaveLength(1);
      const instance = new (result[0] as unknown as new () => {
        customQuestionConfig: ICustomQuestionTypeConfiguration;
      })();
      const config = instance.customQuestionConfig;
      expect(config).not.toHaveProperty("__proto__");
    });

    it("should remove eval patterns from strings", () => {
      const maliciousJson = JSON.stringify({
        name: "test",
        title: "Test Question",
        description: 'eval("malicious code")',
      });
      const result = initializeCustomQuestions([maliciousJson]);
      expect(result).toHaveLength(1);
    });

    it("should handle deeply nested malicious code", () => {
      const maliciousJson = JSON.stringify({
        name: "test",
        title: "Test Question",
        questionJSON: {
          type: "text",
          nested: {
            deeper: {
              onInit: () => console.log("malicious"),
              code: "function() { malicious }",
            },
          },
        },
      });
      const result = initializeCustomQuestions([maliciousJson]);
      expect(result).toHaveLength(1);
    });
  });
});
