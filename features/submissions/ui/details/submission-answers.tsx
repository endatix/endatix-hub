"use client";

import { customizeSurvey } from "@/lib/kantar/customize-survey";
import { Model, Question } from "survey-core";
import AnswerViewer from "../answers/answer-viewer";

export function SubmissionAnswers({
  formDefinition,
  submissionData,
}: {
  formDefinition: string;
  submissionData: string;
}) {
  let questions: Question[] = [];

  if (!formDefinition || !submissionData) {
    return <ErrorView />;
  }

  try {
    const json = JSON.parse(formDefinition);
    const surveyModel = new Model(json);

    const parsedData = JSON.parse(submissionData);
    surveyModel.data = parsedData;
    customizeSurvey(surveyModel);

    questions = surveyModel.getAllQuestions(false, false, true);
  } catch (ex) {
    console.warn("Error while parsing submission's JSON data", ex);
    return <ErrorView />;
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
