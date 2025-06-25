"use client";

import { SectionTitle } from "@/components/headings/section-title";
import { EyeOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Question, QuestionNonValue } from "survey-core";
import AnswerViewer from "../answers/answer-viewer";
import { QuestionLabel } from "./question-label";
import { CustomQuestion } from "@/services/api";
import { Submission } from "@/types";
import { useSurveyModel } from "@/features/public-form/ui/use-survey-model.hook";
import DynamicVariablesList from "./dynamic-variables-list";

interface SubmissionItemRowProps {
  question: Question;
  customQuestionTypes: string[];
}

interface SubmissionAnswersProps {
  formDefinition: string;
  submission: Submission;
  formId: string;
  customQuestions: CustomQuestion[];
}

export function SubmissionAnswers({
  formDefinition,
  submission,
  customQuestions,
}: SubmissionAnswersProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const { surveyModel, error } = useSurveyModel(
    formDefinition,
    submission,
    customQuestions.map((q: CustomQuestion) => q.jsonData),
  );
  const customQuestionTypes = useMemo(
    () => customQuestions.map((q: CustomQuestion) => q.name),
    [customQuestions],
  );

  useEffect(() => {
    if (!surveyModel) {
      return;
    }

    const surveyQuestions = surveyModel.getAllQuestions(false, false, false);
    setQuestions(surveyQuestions);
  }, [surveyModel]);

  if (!surveyModel) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <ErrorView />;
  }

  return (
    <>
      <SectionTitle title="Submission Answers" headingClassName="py-2 my-0" />
      <div className="grid gap-4">
        <DynamicVariablesList surveyModel={surveyModel} />
        {questions.map((question) => (
          <SubmissionItemRow
            key={question.id}
            question={question}
            customQuestionTypes={customQuestionTypes}
          />
        ))}
      </div>
    </>
  );
}

const SubmissionItemRow = ({ question }: SubmissionItemRowProps) => {
  if (question instanceof QuestionNonValue) {
    return null;
  }

  if (!question.isVisibleInSurvey) {
    return (
      <div
        key={question.id}
        className="grid grid-cols-5 items-start gap-4 mb-6"
      >
        <QuestionLabel forQuestion={question} title={question.title} />
        <div className="col-span-3 flex items-center gap-2 pt-2">
          <EyeOff className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            This question was not visible in the survey.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div key={question.id} className="grid grid-cols-5 items-start gap-4 mb-6">
      <QuestionLabel forQuestion={question} title={question.title} />
      <AnswerViewer
        key={question.id}
        forQuestion={question}
        className="col-span-3"
      />
    </div>
  );
};

const ErrorView = () => {
  return <div>Error loading submission answers</div>;
};
