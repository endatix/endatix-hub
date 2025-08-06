/**
 * Factory function for creating question modules
 * Ensures consistent structure and provides validation
 * Registration should be handled manually following SurveyJS pattern
 */

export interface QuestionConfig {
  name: string;
  title: string;
  iconName?: string;
  category?: string;
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

  // Set defaults
  const questionModule = {
    name: config.name,
    title: config.title,
    iconName: config.iconName || `icon-${config.name}`,
    category: config.category || "custom",
    model: config.model,
  };

  return questionModule;
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
  iconName?: string;
  category?: string;
}) {
  return createQuestionModule(options);
}
