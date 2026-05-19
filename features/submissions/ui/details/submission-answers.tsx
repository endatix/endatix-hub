"use client";

import {
  useStorageReadRuntime,
  useStorageView,
} from "@/features/asset-storage/client";
import { useSurveyModel } from "@/features/public-form/ui/use-survey-model.hook";
import { useDesignerRuntime } from "@/lib/designer-runtime";
import { registerAudioQuestion } from "@/lib/questions/audio-recorder";
import { cn } from "@/lib/utils";
import { useSurveyExtensions } from "@/lib/survey-extensions/ui/use-survey-extensions";
import { CustomQuestion } from "@/services/api";
import { EyeOff } from "lucide-react";
import { useCallback, useEffect } from "react";
import { Question, surveyLocalization } from "survey-core";
import {
  getSubmissionLocale,
  isLocaleValid,
} from "../../submission-localization";
import { getQuestionNumber } from "../../submission-utils";
import AnswerViewer from "../answers/answer-viewer";
import {
  useSubmissionDetails,
  useSubmissionDetailsViewOptions,
} from "./submission-details-context";

registerAudioQuestion();

interface SubmissionAnswersProps {
  customQuestions: CustomQuestion[];
}

export function SubmissionAnswers({
  customQuestions,
}: Readonly<SubmissionAnswersProps>) {
  const { submission, submissionNavPages } = useSubmissionDetails();
  const designerRuntime = useDesignerRuntime();
  const formId = submission.formId;
  const formDefinition = submission.formDefinition?.jsonData ?? "";
  const getRuntimeState = useCallback(() => {
    return designerRuntime.stateRef.current;
  }, [designerRuntime]);
  const { isReady: isExtensionsReady, onModelCreated } = useSurveyExtensions({
    formJson: formDefinition,
    runtimeDeps: {
      getRuntimeState,
    },
  });
  const { surveyModel, error } = useSurveyModel({
    formId,
    definition: formDefinition,
    submission,
    customQuestions: customQuestions.map((q: CustomQuestion) => q.jsonData),
    onModelCreated,
  });

  const getReadRuntime = useStorageReadRuntime({ formId });
  const { setSurveyModel } = useSubmissionDetails();
  const { viewOptions } = useSubmissionDetailsViewOptions();
  const { prefetchPrivateReadUrlsForModel } = useStorageView({
    getReadRuntime,
  });

  useEffect(() => {
    setSurveyModel(surveyModel);
  }, [surveyModel, setSurveyModel]);

  useEffect(() => {
    if (!surveyModel) {
      return;
    }
    void prefetchPrivateReadUrlsForModel(surveyModel);
  }, [surveyModel, prefetchPrivateReadUrlsForModel]);

  useEffect(() => {
    if (!surveyModel) {
      return;
    }

    const submissionLocale = getSubmissionLocale(submission);
    if (
      viewOptions.useSubmissionLanguage &&
      isLocaleValid(submissionLocale, surveyModel)
    ) {
      surveyModel.locale = submissionLocale!;
    } else {
      surveyModel.locale = surveyLocalization.defaultLocale;
    }

    surveyModel.showQuestionNumbers = true;
  }, [surveyModel, viewOptions.useSubmissionLanguage, submission]);

  if (!isExtensionsReady) {
    return <div>Loading...</div>;
  }

  if (!surveyModel) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <ErrorView />;
  }

  return (
    <div className="space-y-12">
      {submissionNavPages.map((page, pageIndex) => (
        <div
          key={page.pageName}
          id={`page-${page.pageName}`}
          className="space-y-6"
        >
          <div className="mb-4 flex items-center gap-4">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-md text-sm font-bold text-white",
                page.isPageInvisible ? "bg-slate-400" : "bg-primary",
              )}
            >
              {pageIndex + 1}
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black tracking-tight text-foreground">
                {page.pageTitle}
              </h2>
              {page.isPageInvisible && (
                <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <EyeOff className="size-3" />
                  Invisible
                </span>
              )}
            </div>
          </div>
          {page.questions.map((q) => (
            <SubmissionItemCard
              key={q.question.id}
              question={q.question}
              isInvisible={q.isInvisible}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface SubmissionItemCardProps {
  question: Question;
  isInvisible: boolean;
}

const selectedQuestionCardClass = "selected ring-2 ring-primary/80 ring-inset";

const SubmissionItemCard = ({
  question,
  isInvisible,
}: Readonly<SubmissionItemCardProps>) => {
  const { highlightedQuestionName } = useSubmissionDetails();
  const { viewOptions } = useSubmissionDetailsViewOptions();
  const isSelected = highlightedQuestionName === question.name;
  const questionLabel =
    getQuestionNumber(question) > 0
      ? `Question #${getQuestionNumber(question)}`
      : "Question";

  if (isInvisible && !viewOptions.showInvisibleItems) {
    return null;
  }

  if (isInvisible) {
    return (
      <article
        id={`${question.name}`}
        className={cn(
          "rounded-md border border-slate-200/40 bg-surface-container-lowest p-8 transition-colors hover:border-primary dark:border-slate-700/40 dark:bg-surface-container-low",
          isSelected && selectedQuestionCardClass,
        )}
        data-selected={isSelected ? true : undefined}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-wider text-primary uppercase">
              {questionLabel} • {question.getType()}
            </span>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              {question.title}
            </h3>
          </div>
        </div>
        <div className="mt-4 rounded-md border border-slate-100 bg-surface-container-low p-5 dark:border-slate-800 dark:bg-surface-container">
          <div className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              This question was not visible in the survey.
            </p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      id={`${question.name}`}
      className={cn(
        "rounded-md border border-slate-200/40 bg-surface-container-lowest p-8 transition-colors hover:border-primary dark:border-slate-700/40 dark:bg-surface-container-low",
        isSelected && selectedQuestionCardClass,
      )}
      data-selected={isSelected ? true : undefined}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-bold tracking-wider text-primary uppercase">
            {questionLabel} • {question.getType()}
          </span>
          <h3 className="text-lg leading-snug font-bold tracking-tight text-foreground">
            {question.title}
          </h3>
        </div>
      </div>
      <div className="rounded-md border border-slate-100 bg-surface-container-low p-5 dark:border-slate-800 dark:bg-surface-container">
        <AnswerViewer
          key={question.id}
          forQuestion={question}
          className="w-full min-w-0"
        />
      </div>
    </article>
  );
};

const ErrorView = () => {
  return <div>Error loading submission answers</div>;
};
