import { GetLoopQuestionsEvent, SurveyModel } from "survey-core";
import { isLoopQuestion } from "@/lib/survey-features/question-loops/utils/collect-loop-questions";

/**
 * Drops the summary step of question loops in one-input-per-page layout.
 * SurveyJS lists that step as the question itself in `nestedQuestions`.
 * Other dynamic questions keep it: their "Add" button lives on that step.
 */
export function registerLoopAwareSummaryTable(surveyModel: SurveyModel): () => void {
  const handler = (_sender: unknown, options: GetLoopQuestionsEvent) => {
    if (!isLoopQuestion(options.question)) return;

    const nestedQuestions = options.nestedQuestions;
    for (let i = nestedQuestions.length - 1; i >= 0; i--) {
      if (nestedQuestions[i] === options.question) {
        nestedQuestions.splice(i, 1);
      }
    }
  };

  surveyModel.onGetLoopQuestions.add(handler);

  return () => {
    surveyModel.onGetLoopQuestions.remove(handler);
  };
}
