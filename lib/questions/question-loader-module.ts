/**
 * Static module for dynamic question loading
 * This acts as a bridge between Turbopack's static alias resolution
 * and our dynamic question loading system
 */
import {
  questionModuleMap,
  QuestionName,
} from "@/customizations/questions/question-registry";

interface QuestionModule {
  name: string;
  title: string;
  iconName?: string;
  category?: string;
  model?: unknown;
}

/**
 * Dynamic question loader that works with Turbopack's static alias resolution
 * Questions are automatically registered when loaded (pure SurveyJS pattern)
 */
class QuestionLoaderModule {
  private loadedQuestions = new Map<string, QuestionModule>();
  private loadingPromises = new Map<string, Promise<QuestionModule>>();

  /**
   * Load a question dynamically using the customizations/questions directory
   * @param questionName - The name of the question to load
   */
  async loadQuestion(questionName: string): Promise<QuestionModule> {
    if (this.loadedQuestions.has(questionName)) {
      return this.loadedQuestions.get(questionName)!;
    }

    // Check if currently loading
    if (this.loadingPromises.has(questionName)) {
      return this.loadingPromises.get(questionName)!;
    }

    // Start loading
    const loadPromise = this.loadCustomQuestion(questionName);
    this.loadingPromises.set(questionName, loadPromise);

    try {
      const questionModule = await loadPromise;
      this.loadedQuestions.set(questionName, questionModule);
      this.loadingPromises.delete(questionName);

      console.debug(`✅ Loaded custom question: ${questionName}`);

      return questionModule;
    } catch (error) {
      this.loadingPromises.delete(questionName);
      throw error;
    }
  }

  /**
   * Load question from the customizations/questions directory
   */
  private async loadCustomQuestion(
    questionName: string,
  ): Promise<QuestionModule> {
    try {
      if (Object.keys(questionModuleMap).length === 0) {
        throw new Error(`No custom questions are registered.`);
      }

      const loader = questionModuleMap[questionName as QuestionName];

      if (!loader) {
        throw new Error(`Question module "${questionName}" is not registered.`);
      }

      const questionModule = await (
        loader as () => Promise<{ default?: unknown; [key: string]: unknown }>
      )();
      const question = questionModule.default || questionModule;

      if (!question || typeof question !== "object") {
        throw new Error(`Invalid question module for ${questionName}`);
      }

      // Validate that the question has the required properties
      if (!("name" in question) || !("title" in question)) {
        throw new Error(
          `Question module for ${questionName} is missing required properties (name, title)`,
        );
      }

      return question as QuestionModule;
    } catch (error) {
      console.error(`Failed to load question ${questionName}:`, error);
      throw new Error(`Question '${questionName}' not found or failed to load`);
    }
  }

  /**
   * Load multiple questions at once
   */
  async loadQuestions(questionNames: string[]): Promise<QuestionModule[]> {
    const promises = questionNames.map((name) => this.loadQuestion(name));
    return Promise.all(promises);
  }

  /**
   * Get list of loaded questions
   */
  getLoadedQuestions(): string[] {
    return Array.from(this.loadedQuestions.keys());
  }

  /**
   * Check if a question is loaded
   */
  isQuestionLoaded(questionName: string): boolean {
    return this.loadedQuestions.has(questionName);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.loadedQuestions.clear();
  }
}

// Export singleton instance
export const questionLoaderModule = new QuestionLoaderModule();

// Export the class for testing
export { QuestionLoaderModule };

// Export types
export type { QuestionModule };
