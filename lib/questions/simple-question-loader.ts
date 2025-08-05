interface QuestionModule {
  name: string;
  title: string;
  iconName?: string;
  category?: string;
  register: () => void;
  model?: unknown;
}

/**
 * Simple question loader using Turbopack's dynamic imports
 * Much cleaner than webpack plugins and API routes
 */
class SimpleQuestionLoader {
  private loadedQuestions = new Map<string, QuestionModule>();

  /**
   * Load a question using dynamic import with Turbopack alias
   * @param questionName - The name of the question to load
   */
  async loadQuestion(questionName: string): Promise<QuestionModule> {
    // Check if already loaded
    if (this.loadedQuestions.has(questionName)) {
      return this.loadedQuestions.get(questionName)!;
    }

    try {
      // Simple dynamic import - Turbopack handles the rest
      const questionModule = await import(`questions/${questionName}`);
      const question = questionModule.default || questionModule;

      // Cache the loaded question
      this.loadedQuestions.set(questionName, question);

      // Register with SurveyJS if register function exists
      if (question.register) {
        question.register();
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

export const simpleQuestionLoader = new SimpleQuestionLoader();
