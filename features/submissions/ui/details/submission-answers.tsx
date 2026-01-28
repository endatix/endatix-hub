"use client";

import { SectionTitle } from "@/components/headings/section-title";
import { EyeOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Question, QuestionNonValue } from "survey-core";
import AnswerViewer from "../answers/answer-viewer";
import { QuestionLabel } from "./question-label";
import { CustomQuestion } from "@/services/api";
import { Submission } from "@/lib/endatix-api";
import { useSurveyModel } from "@/features/public-form/ui/use-survey-model.hook";
import DynamicVariablesList from "./dynamic-variables-list";
import { useSubmissionDetailsViewOptions } from "./submission-details-view-options-context";
import { surveyLocalization } from "survey-core";
import {
  getSubmissionLocale,
  isLocaleValid,
} from "../../submission-localization";
import { registerAudioQuestion } from "@/lib/questions/audio-recorder";

registerAudioQuestion();

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
  formId,
  customQuestions,
}: SubmissionAnswersProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const { surveyModel, error } = useSurveyModel({
    formId,
    definition: formDefinition,
    submission,
    customQuestions: customQuestions.map((q: CustomQuestion) => q.jsonData),
  });
  const customQuestionTypes = useMemo(
    () => customQuestions.map((q: CustomQuestion) => q.name),
    [customQuestions],
  );

  const { options } = useSubmissionDetailsViewOptions();

  useEffect(() => {
    if (!surveyModel) {
      return;
    }

    const submissionLocale = getSubmissionLocale(submission);
    if (
      options.useSubmissionLanguage &&
      isLocaleValid(submissionLocale, surveyModel)
    ) {
      surveyModel.locale = submissionLocale!;
    } else {
      surveyModel.locale = surveyLocalization.defaultLocale;
    }

    const surveyQuestions = surveyModel.getAllQuestions(false, false, false);
    setQuestions(surveyQuestions);
  }, [
    surveyModel,
    submission.metadata,
    options.useSubmissionLanguage,
    surveyModel?.locale,
    submission,
  ]);

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
  const { options } = useSubmissionDetailsViewOptions();
  if (question instanceof QuestionNonValue) {
    return null;
  }

  if (!question.isVisibleInSurvey) {
    return options.showInvisibleItems ? (
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
    ) : null;
  }

  return (
    <div
      key={question.id}
      className="grid grid-cols-5 items-center align-middle gap-4 mb-6"
    >
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
