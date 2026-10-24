"use client";

import { useEffect, useState } from "react";
import type { ITheme, Model } from "survey-core";
import "survey-core/survey-core.css";
import { Survey } from "survey-react-ui";
import { customQuestions as registryQuestions } from "@/customizations/questions/question-registry";
import { initializeCustomQuestions } from "@/lib/questions";
import { registerAudioQuestion } from "@/lib/questions/audio-recorder";
import addRandomizeGroupFeature from "@/lib/questions/features/group-randomization";
import { questionLoaderModule } from "@/lib/questions/question-loader-module";
import { useAnyAnswered } from "@/lib/survey-features/any-answered";
import { useQuestionLoops } from "@/lib/survey-features/question-loops";
import { applyFormSurveyTheme } from "@/lib/themes/survey-theme";
import { previewAsModel } from "../preview-model";

type PreviewSurveyProps = {
  definition: object;
  variables: Record<string, unknown>;
  theme?: string;
  customQuestions: string[];
};

let isRuntimeReady = false;

/** What the shared form registers before it builds a model (`use-survey-model.hook.ts`). */
async function prepareRuntime(customQuestions: string[]) {
  if (customQuestions.length) initializeCustomQuestions(customQuestions);
  if (isRuntimeReady) return;
  registerAudioQuestion();
  addRandomizeGroupFeature();
  await Promise.allSettled(
    registryQuestions.map((name) => questionLoaderModule.loadQuestion(name)),
  );
  isRuntimeReady = true;
}

function parseTheme(theme: string | undefined): ITheme | undefined {
  if (!theme) return undefined;
  try {
    return JSON.parse(theme) as ITheme;
  } catch {
    return undefined;
  }
}

function buildModel({ definition, variables, theme }: PreviewSurveyProps) {
  const model = previewAsModel(definition, variables);
  applyFormSurveyTheme(model, parseTheme(theme));
  return model;
}

type Runtime = {
  initGlobals: () => void;
  bindToSurvey: (model: Model) => (() => void) | undefined;
};

/** Builds the model once the shared form's runtime is ready; returns the cleanup. */
function mountModel(
  content: string,
  runtime: Runtime,
  onModel: (m: Model) => void,
) {
  const props = JSON.parse(content) as PreviewSurveyProps;
  let unbind: (() => void) | undefined;
  let cancelled = false;
  void prepareRuntime(props.customQuestions).then(() => {
    if (cancelled) return;
    runtime.initGlobals();
    const model = buildModel(props);
    unbind = runtime.bindToSurvey(model) ?? undefined;
    onModel(model);
  });
  return () => {
    cancelled = true;
    unbind?.();
  };
}

/** A model per content, not per server refresh: a refresh hands over equal but new objects. */
function usePreviewModel(props: PreviewSurveyProps) {
  const [model, setModel] = useState<Model | null>(null);
  const { initGlobals: initAnyAnswered } = useAnyAnswered();
  const { initGlobals: initLoops, bindToSurvey } = useQuestionLoops();
  const content = JSON.stringify(props);
  useEffect(() => {
    const initGlobals = () => {
      initAnyAnswered();
      initLoops();
    };
    return mountModel(content, { initGlobals, bindToSurvey }, setModel);
  }, [content, initAnyAnswered, initLoops, bindToSurvey]);
  return model;
}

/**
 * The saved form for one participant, with the form's own theme and questions, as the shared
 * form renders it. Nothing listens to its answers, so nothing is written.
 */
export function PreviewSurvey(props: Readonly<PreviewSurveyProps>) {
  const model = usePreviewModel(props);
  if (!model)
    return <p className="text-sm text-muted-foreground">Loading the form…</p>;
  return <Survey model={model} />;
}
