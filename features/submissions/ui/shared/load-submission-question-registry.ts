import { customQuestions } from "@/customizations/questions/question-registry";
import { questionLoaderModule } from "@/lib/questions/question-loader-module";

/** Loads registered custom question modules for submission survey surfaces. */
export async function loadSubmissionQuestionRegistry(): Promise<void> {
  for (const questionName of customQuestions) {
    try {
      await questionLoaderModule.loadQuestion(questionName);
      console.debug(`✅ Loaded custom question: ${questionName}`);
    } catch (error) {
      console.warn(`⚠️ Failed to load custom question: ${questionName}`, error);
    }
  }
}

void loadSubmissionQuestionRegistry();
