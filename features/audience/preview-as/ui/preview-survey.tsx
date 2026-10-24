"use client";

import { useEffect, useState } from "react";
import type { Model } from "survey-core";
import "survey-core/survey-core.css";
import { Survey } from "survey-react-ui";
import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { initializeCustomQuestions } from "@/lib/questions/infrastructure/specialized-survey-question";
import { Result } from "@/lib/result";
import { useAnyAnswered } from "@/lib/survey-features/any-answered";
import { useQuestionLoops } from "@/lib/survey-features/question-loops";
import { useEndatixSurveyTheme } from "@/lib/themes/use-endatix-themes";
import { previewAsModel } from "../preview-model";

type PreviewSurveyProps = {
  definition: object;
  variables: Record<string, unknown>;
};

async function loadCustomQuestions() {
  const result = await getCustomQuestionsAction().catch(() => undefined);
  if (result && Result.isSuccess(result)) {
    const questions = result.value.map((question) => question.jsonData);
    if (questions.length > 0) initializeCustomQuestions(questions);
  }
}

/** The saved form for one participant. Nothing is listened to, so nothing is written. */
export function PreviewSurvey({
  definition,
  variables,
}: Readonly<PreviewSurveyProps>) {
  const [model, setModel] = useState<Model | null>(null);
  const { initGlobals: initAnyAnswered } = useAnyAnswered();
  const { initGlobals: initLoops, bindToSurvey } = useQuestionLoops();
  const theme = useEndatixSurveyTheme();

  useEffect(() => {
    let unbind: (() => void) | undefined;
    let cancelled = false;
    void loadCustomQuestions().then(() => {
      if (cancelled) return;
      initAnyAnswered();
      initLoops();
      const next = previewAsModel(definition, variables);
      next.applyTheme(theme);
      unbind = bindToSurvey(next) ?? undefined;
      setModel(next);
    });
    return () => {
      cancelled = true;
      unbind?.();
    };
  }, [definition, variables, theme, initAnyAnswered, initLoops, bindToSurvey]);

  if (!model)
    return <p className="text-sm text-muted-foreground">Loading the form…</p>;
  return <Survey model={model} />;
}
