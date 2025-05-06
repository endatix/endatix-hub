"use client";

import { Model, Question } from "survey-core";
import AnswerViewer from "../answers/answer-viewer";
import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { useEffect, useState } from "react";
import { CustomQuestion } from "@/services/api";
import { Result } from "@/lib/result";
import { initializeCustomQuestions } from "@/lib/questions/infrastructure/specialized-survey-question";

export function SubmissionAnswers({
  formDefinition,
  submissionData,
}: {
  formDefinition: string;
  submissionData: string;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const result = await getCustomQuestionsAction();
        if (Result.isSuccess(result)) {
          initializeCustomQuestions(result.value.map((q: CustomQuestion) => q.jsonData));
        }
        
        const json = JSON.parse(formDefinition);
        const surveyModel = new Model(json);

        const parsedData = JSON.parse(submissionData);
        surveyModel.data = parsedData;

        const allQuestions = surveyModel.getAllQuestions(false, false, true);
        
        // Filter out panel questions since their nested questions are already present
        const questions = allQuestions.filter(question => {
          const customQuestion = question.customQuestion;
          if (customQuestion?.json.elementsJSON) {
            return false;
          }
          return true;
        });

        // Convert remaining custom questions to their base types
        questions.forEach(question => {
          const customQuestion = question.customQuestion;
          if (customQuestion?.json.questionJSON) {
            question.fromJSON(customQuestion.json.questionJSON);
          }
        });

        setQuestions(questions);
      } catch (ex) {
        console.error("Error while loading submission's data", ex);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, [formDefinition, submissionData]);

  if (!formDefinition || !submissionData) {
    return <ErrorView />;
  }

  if (isLoading) {
    return <div>Loading submission answers...</div>;
  }

  return (
    <div className="grid gap-4">
      {questions?.map((question) => (
        <div
          key={question.id}
          className="grid grid-cols-5 items-center gap-4 mb-6"
        >
          <AnswerViewer key={question.id} forQuestion={question} />
        </div>
      ))}
    </div>
  );
}

const ErrorView = () => {
  return <div>Error loading submission answers</div>;
};
