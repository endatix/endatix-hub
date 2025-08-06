import { Serializer, QuestionFactory } from "survey-core";

/**
 * Factory function for creating question modules
 * Ensures consistent structure and provides validation
 */

export interface QuestionConfig {
  name: string;
  title: string;
  iconName?: string;
  category?: string;
  register?: () => void; // Optional - will auto-generate if not provided
  model?: unknown;
}

/**
 * Creates a question module with consistent structure
 * @param config - Question configuration
 * @returns Question module object
 */
export function createQuestionModule(config: QuestionConfig) {
  // Validate required fields
  if (!config.name) {
    throw new Error("Question name is required");
  }
  if (!config.title) {
    throw new Error("Question title is required");
  }

  // Auto-generate registration function if not provided
  const registerFunction =
    config.register || createDefaultRegisterFunction(config.name, config.model);

  // Set defaults
  const questionModule = {
    name: config.name,
    title: config.title,
    iconName: config.iconName || `icon-${config.name}`,
    category: config.category || "custom",
    register: registerFunction,
    model: config.model,
  };

  return questionModule;
}

/**
 * Auto-generates a default registration function for SurveyJS
 * @param questionName - The name of the question type
 * @param modelClass - The question model class
 * @returns Registration function
 */
function createDefaultRegisterFunction(
  questionName: string,
  modelClass?: unknown,
) {
  return () => {
    // Register with Serializer if model class is provided
    if (modelClass && typeof modelClass === "function") {
      Serializer.addClass(
        questionName,
        [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => new (modelClass as any)(""),
        "question",
      );
    }

    // Register with QuestionFactory if model class is provided
    if (modelClass && typeof modelClass === "function") {
      QuestionFactory.Instance.registerQuestion(
        questionName,
        (name: string) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return new (modelClass as any)(name);
        },
      );
    }

    console.debug(`${questionName} question registered successfully`);
  };
}

/**
 * Helper function to create a question module with common defaults
 * @param options - Question configuration options
 * @returns Question module object
 * 
 * @example
 * ```typescript
 * const myQuestion = createCustomQuestion({
 *   name: "my-question",
 *   title: "My Custom Question",
 *   model: MyQuestionModel,
 *   iconName: "icon-custom",
 *   category: "custom"
 * });
 * ```
 */
export function createCustomQuestion(options: {
  name: string;
  title: string;
  model?: unknown;
  register?: () => void;
  iconName?: string;
  category?: string;
}) {
  return createQuestionModule(options);
}
