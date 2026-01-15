import { GetLoopQuestionsEvent, SurveyModel } from "survey-core";

export function registerLoopAwareSummaryTable(surveyModel: SurveyModel): () => void {
  const handler = (_sender: unknown, options: GetLoopQuestionsEvent) => {
    const nestedQuestions = options.nestedQuestions;

    for (let i = nestedQuestions.length - 1; i >= 0; i--) {
      if (nestedQuestions[i] === options.question) {
        // if question equals to the options.question then it is a summary
        nestedQuestions.splice(i, 1);
      }
    }
  };

  surveyModel.onGetLoopQuestions.add(handler);

  return () => {
    surveyModel.onGetLoopQuestions.remove(handler);
  };
}