"use client";

import { useEffect, useMemo, useState } from "react";
import type { ITheme, Model } from "survey-core";
import "survey-core/survey-core.css";
import { Survey } from "survey-react-ui";
import { customQuestions as registryQuestions } from "@/customizations/questions/question-registry";
import { TelemetryLogger } from "@/features/telemetry";
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

async function registerRuntime() {
  registerAudioQuestion();
  addRandomizeGroupFeature();
  await Promise.allSettled(
    registryQuestions.map((name) => questionLoaderModule.loadQuestion(name)),
  );
}

/** One registration for every mount, started again only after it failed. */
let registration: Promise<void> | null = null;

/** What the shared form registers before it builds a model (`use-survey-model.hook.ts`). */
async function prepareRuntime(customQuestions: string[]) {
  registration ??= registerRuntime().catch((error: unknown) => {
    registration = null;
    throw error;
  });
  await registration;
  if (customQuestions.length) initializeCustomQuestions(customQuestions);
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

type Mounted = { model: Model } | { failed: true } | null;

function logFailure(error: unknown) {
  TelemetryLogger.error(
    "Failed to build the Preview as form.",
    error,
    undefined,
    "audience.preview-as",
  );
}

type Mount = {
  props: PreviewSurveyProps;
  runtime: Runtime;
  onMounted: (mounted: Mounted) => void;
};

type Live = { cancelled: boolean; model?: Model; unbind?: () => void };

function mountInto(live: Live, { props, runtime, onMounted }: Mount) {
  if (live.cancelled) return;
  runtime.initGlobals();
  live.model = buildModel(props);
  live.unbind = runtime.bindToSurvey(live.model) ?? undefined;
  onMounted({ model: live.model });
}

function unmount(live: Live, onMounted: Mount["onMounted"]) {
  live.cancelled = true;
  live.unbind?.();
  onMounted(null);
  live.model?.dispose();
}

/** Builds the model once the runtime is ready; a failure anywhere shows, instead of loading forever. */
function mountModel(
  content: string,
  runtime: Runtime,
  onMounted: Mount["onMounted"],
) {
  const props = JSON.parse(content) as PreviewSurveyProps;
  const live: Live = { cancelled: false };
  prepareRuntime(props.customQuestions)
    .then(() => mountInto(live, { props, runtime, onMounted }))
    .catch((error: unknown) => {
      logFailure(error);
      if (!live.cancelled) onMounted({ failed: true });
    });
  return () => unmount(live, onMounted);
}

/** A model per content, not per server refresh: a refresh hands over equal but new objects. */
function usePreviewModel(props: PreviewSurveyProps): Mounted {
  const [mounted, setMounted] = useState<Mounted>(null);
  const { initGlobals: initAnyAnswered } = useAnyAnswered();
  const { initGlobals: initLoops, bindToSurvey } = useQuestionLoops();
  const { definition, variables, theme, customQuestions } = props;
  const content = useMemo(
    () => JSON.stringify({ definition, variables, theme, customQuestions }),
    [definition, variables, theme, customQuestions],
  );
  useEffect(() => {
    const initGlobals = () => {
      initAnyAnswered();
      initLoops();
    };
    return mountModel(content, { initGlobals, bindToSurvey }, setMounted);
  }, [content, initAnyAnswered, initLoops, bindToSurvey]);
  return mounted;
}

/**
 * The saved form for one participant, with the form's own theme and questions, as the shared
 * form renders it. Nothing listens to its answers, so nothing is written.
 */
export function PreviewSurvey(props: Readonly<PreviewSurveyProps>) {
  const mounted = usePreviewModel(props);
  if (mounted && "failed" in mounted)
    return (
      <p role="alert" className="p-6 text-sm text-destructive">
        The form could not be shown. Reload the page to try again.
      </p>
    );
  if (!mounted)
    return <p className="text-sm text-muted-foreground">Loading the form…</p>;
  return <Survey model={mounted.model} />;
}
