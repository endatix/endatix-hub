/**
 * Static module for dynamic question loading
 * This acts as a bridge between Turbopack's static alias resolution
 * and our dynamic question loading system
 */
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
    // Check if already loaded
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
      // Use relative path to customizations/questions directory, specifically index.ts
      const questionModule = await import(
        `@/customizations/questions/${questionName}/index.ts`
      );
      const question = questionModule.default || questionModule;

      if (!question || typeof question !== "object") {
        throw new Error(`Invalid question module for ${questionName}`);
      }

      return question;
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
