"use client";

import { useSurveyExtensions } from "@/lib/survey-extensions/ui/use-survey-extensions";
import { Submission } from "@/lib/endatix-api";
import { registerAudioQuestion } from "@/lib/questions/audio-recorder";
import addRandomizeGroupFeature from "@/lib/questions/features/group-randomization";
import dynamic from "next/dynamic";
import { useFormRuntime } from "@/lib/form-runtime/form-runtime.context";
import type { EmbedFormInfo } from "@/features/embed-form/types";

const SurveyComponent = dynamic(() => import("./survey-component"), {
  ssr: false,
});

registerAudioQuestion();
addRandomizeGroupFeature();

export type SurveyJsWrapperProps = {
  definition: string;
  formId: string;
  submission?: Submission;
  theme?: string;
  customQuestions?: string[];
  requiresReCaptcha?: boolean;
  urlToken?: string;
  extensionIdsToLoad?: string[];
} & (
  | {
      isEmbed: true;
      definitionId: string;
      limitOnePerUser?: boolean;
      metadata?: string;
    }
  | {
      isEmbed?: false;
    }
);

const SurveyJsWrapper = (props: SurveyJsWrapperProps) => {
  const {
    formId,
    definition,
    submission,
    theme,
    customQuestions,
    requiresReCaptcha,
    urlToken,
    extensionIdsToLoad,
  } = props;

  const formRuntime = useFormRuntime();
  const { isReady, onModelCreated } = useSurveyExtensions({
    formJson: definition,
    extensionIdsToLoad,
    runtimeDeps: {
      getRuntimeState: () => formRuntime.stateRef.current,
    },
  });

  if (!isReady) {
    return null;
  }

  const embedForm: EmbedFormInfo | undefined = props.isEmbed
    ? {
        formId,
        definitionId: props.definitionId,
        limitOnePerUser: props.limitOnePerUser ?? false,
        requiresReCaptcha: requiresReCaptcha ?? false,
        metadata: props.metadata,
      }
    : undefined;

  return (
    <SurveyComponent
      formId={formId}
      definition={definition}
      submission={submission}
      theme={theme}
      customQuestions={customQuestions}
      requiresReCaptcha={requiresReCaptcha}
      isEmbed={props.isEmbed ?? false}
      embedForm={embedForm}
      urlToken={urlToken}
      onModelCreated={onModelCreated}
    />
  );
};

export default SurveyJsWrapper;
