import {
  ComponentCollection,
  ICustomQuestionTypeConfiguration,
  Question,
} from "survey-core";
import { SurveyCreator } from "survey-creator-react";

/**
 * Abstract base class for creating custom question types in SurveyJS.
 * Provides a standardized way to define and register specialized survey questions.
 */
export abstract class SpecializedSurveyQuestion {
  /**
   * Gets the configuration object that defines this custom question type.
   * The configuration specifies properties like name, title, icon, and behavior.
   * Must be implemented by concrete question classes.
   */
  abstract get customQuestionConfig(): ICustomQuestionTypeConfiguration;

  /**
   * Customizes the SurveyCreator toolbox and other editor-specific settings for this question type.
   * Must be implemented as a static method by concrete question classes.
   * @param creator - The SurveyCreator instance to customize
   */
  static customizeEditor(creator: SurveyCreator): void {
    console.error("customizeEditor not implemented", creator);

    throw new Error("customizeEditor method not implemented.");
  }
}

export interface CustomQuestionConfig {
  name: string;
  title: string;
  iconName?: string;
  category?: string;
  orderedAfter?: string;
  defaultQuestionTitle?: string;
  inheritBaseProps?: boolean;
  questionJSON?: Question;
  elementsJSON?: Question[];
}

/**
 * Properties that must be ignored to prevent code injection and other security issues
 */
const IGNORED_PROPERTIES = new Set([
  "onInit",
  "onCreated",
  "onAfterRender",
  "onAfterRenderContentElement",
  "onUpdateQuestionCssClasses",
  "onPropertyChanged",
  "onValueChanged",
  "__proto__",
  "constructor",
  "prototype",
  "eval",
  "Function",
]);

/**
 * Maximum allowed size for custom question JSON (24KB)
 */
const MAX_JSON_SIZE = 24 * 1024;

/**
 * Parses JSON string with size validation and error handling
 * @param jsonData - JSON string to parse
 * @returns Parsed object or null if parsing fails or exceeds size limit
 */
function parseJsonSafely(jsonData: string): Record<string, unknown> | null {
  if (jsonData.length > MAX_JSON_SIZE) {
    console.error("Custom question JSON exceeds size limit");
    return null;
  }

  try {
    const parsed = JSON.parse(jsonData);

    // Validate structure
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      console.error("Invalid custom question JSON structure");
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch (error) {
    console.error("Failed to parse custom question JSON:", error);
    return null;
  }
}

/**
 * Recursively sanitizes an object by removing dangerous properties
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "function") {
    return undefined;
  }

  if (typeof obj === "string") {
    const suspiciousPatterns = [
      /function\s*\(/,
      /=>/,
      /eval\s*\(/,
      /new\s+Function/,
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(obj))) {
      return undefined;
    }
  }

  if (Array.isArray(obj)) {
    return obj
      .map((item) => sanitizeObject(item))
      .filter((item) => item !== undefined);
  }

  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (IGNORED_PROPERTIES.has(key)) {
        continue;
      }

      const sanitizedValue = sanitizeObject(value);
      if (sanitizedValue !== undefined) {
        sanitized[key] = sanitizedValue;
      }
    }

    return sanitized;
  }

  // Primitives are safe, return the original object
  return obj;
}

/**
 * Validates and sanitizes custom question JSON data
 */
function validateAndSanitizeCustomQuestion(
  parsedJson: Record<string, unknown>,
): CustomQuestionConfig | null {
  if (
    !parsedJson ||
    typeof parsedJson !== "object" ||
    Array.isArray(parsedJson)
  ) {
    console.error("Invalid custom question JSON structure");
    return null;
  }

  if (
    !parsedJson.name ||
    typeof parsedJson.name !== "string" ||
    parsedJson.name.trim().length === 0
  ) {
    console.error("Custom question missing or invalid name");
    return null;
  }

  if (
    !parsedJson.title ||
    typeof parsedJson.title !== "string" ||
    parsedJson.title.trim().length === 0
  ) {
    console.error("Custom question missing or invalid title");
    return null;
  }

  const sanitized = sanitizeObject(parsedJson) as Record<string, unknown>;

  if (!sanitized) {
    console.error("Sanitization removed all data");
    return null;
  }

  const config: CustomQuestionConfig = {
    name: (sanitized.name as string).trim(),
    title: (sanitized.title as string).trim(),
    iconName:
      typeof sanitized.iconName === "string" ? sanitized.iconName : undefined,
    category:
      typeof sanitized.category === "string" ? sanitized.category : undefined,
    orderedAfter:
      typeof sanitized.orderedAfter === "string"
        ? sanitized.orderedAfter
        : undefined,
    defaultQuestionTitle:
      typeof sanitized.defaultQuestionTitle === "string"
        ? sanitized.defaultQuestionTitle
        : undefined,
    inheritBaseProps:
      typeof sanitized.inheritBaseProps === "boolean"
        ? sanitized.inheritBaseProps
        : true,
    ...(sanitized.elementsJSON
      ? { elementsJSON: sanitized.elementsJSON as Question[] }
      : sanitized.questionJSON
      ? { questionJSON: sanitized.questionJSON as Question }
      : {}),
  };

  return config;
}

/**
 * Creates a class that extends SpecializedSurveyQuestion from a config object
 * @param config - The configuration of the custom question
 */
export function createCustomQuestionClass(config: CustomQuestionConfig) {
  return class extends SpecializedSurveyQuestion {
    get customQuestionConfig(): ICustomQuestionTypeConfiguration {
      return {
        name: config.name,
        title: config.title,
        iconName: config.iconName,
        defaultQuestionTitle: config.defaultQuestionTitle || config.title,
        inheritBaseProps: config.inheritBaseProps ?? true,
        ...(config.elementsJSON
          ? { elementsJSON: config.elementsJSON }
          : { questionJSON: config.questionJSON }),
      };
    }

    static customizeEditor(creator: SurveyCreator): void {
      if (config.category) {
        creator.toolbox.changeCategory(config.name, config.category);
      }

      if (
        config.orderedAfter &&
        Array.isArray(creator.toolbox.orderedQuestions)
      ) {
        const orderedQuestions = [...creator.toolbox.orderedQuestions];
        const previousQuestionName = config.orderedAfter;
        const previousIndex = orderedQuestions.indexOf(previousQuestionName);

        if (previousIndex !== -1) {
          orderedQuestions.splice(previousIndex + 1, 0, config.name);
        } else {
          orderedQuestions.push(previousQuestionName);
          orderedQuestions.push(config.name);
        }

        creator.toolbox.orderedQuestions = orderedQuestions;
      }
    }
  };
}

export type SpecializedSurveyQuestionType = typeof SpecializedSurveyQuestion;

const customQuestionsRegistry = new Map<
  string,
  SpecializedSurveyQuestionType
>();

/**
 * Initializes custom question classes from JSON data and maintains a registry of created classes.
 * If a question is already registered, returns the existing class instead of creating a new one.
 * @param questions - Array of JSON strings containing custom question configurations
 * @returns Array of initialized question classes
 */
export function initializeCustomQuestions(
  questions: string[],
): SpecializedSurveyQuestionType[] {
  const questionClasses = questions
    .map((jsonData) => {
      try {
        const parsedJson = parseJsonSafely(jsonData);
        if (!parsedJson) {
          return null;
        }

        const questionName =
          typeof parsedJson.name === "string" ? parsedJson.name : null;

        if (!questionName) {
          console.error("Custom question missing name");
          return null;
        }

        if (customQuestionsRegistry.has(questionName)) {
          return customQuestionsRegistry.get(questionName);
        }

        const config = validateAndSanitizeCustomQuestion(parsedJson);
        if (!config) {
          return null;
        }

        const QuestionClass = createCustomQuestionClass(config);
        registerSpecializedQuestion(QuestionClass);
        customQuestionsRegistry.set(config.name, QuestionClass);
        return QuestionClass;
      } catch {
        console.error("Error registering custom question:", jsonData);
        return null;
      }
    })
    .filter((q): q is SpecializedSurveyQuestionType => q !== null);

  return questionClasses;
}

/**
 * Registers a specialized question type with the SurveyJS ComponentCollection.
 * @param questionClass - The specialized question class to register
 */
export function registerSpecializedQuestion(
  questionClass: SpecializedSurveyQuestionType,
) {
  try {
    const instance =
      new (questionClass as unknown as new () => SpecializedSurveyQuestion)();

    const config = instance.customQuestionConfig;
    const questionName = config.name;

    const isQuestionRegistered =
      ComponentCollection.Instance.getCustomQuestionByName(questionName);

    if (!isQuestionRegistered) {
      ComponentCollection.Instance.add(config);
    }
  } catch (error) {
    console.error("Failed to register specialized question:", error);
  }
}
