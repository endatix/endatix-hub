"use client";

import { useSurveyExtensions } from "@/lib/survey-extensions/ui/use-survey-extensions";
import { Submission } from "@/lib/endatix-api";
import { registerAudioQuestion } from "@/lib/questions/audio-recorder";
import addRandomizeGroupFeature from "@/lib/questions/features/group-randomization";
import dynamic from "next/dynamic";
import { useFormRuntime } from "@/lib/form-runtime/form-runtime.context";

const SurveyComponent = dynamic(() => import("./survey-component"), {
  ssr: false,
});

registerAudioQuestion();
addRandomizeGroupFeature();

export interface SurveyJsWrapperProps {
  definition: string;
  formId: string;
  submission?: Submission | undefined;
  theme?: string;
  customQuestions?: string[];
  requiresReCaptcha?: boolean;
  isEmbed?: boolean;
  urlToken?: string;
  extensionIdsToLoad?: string[];
}

const SurveyJsWrapper = ({
  formId,
  definition,
  submission,
  theme,
  customQuestions,
  requiresReCaptcha,
  isEmbed = false,
  urlToken,
  extensionIdsToLoad,
}: SurveyJsWrapperProps) => {
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

  return (
    <FormRuntimeProvider
      initialState={{
        formId,
        token: urlToken,
        submissionId: submission?.id,
      }}
    >
      <SurveyComponent
        formId={formId}
        definition={definition}
        submission={submission}
        theme={theme}
        customQuestions={customQuestions}
        requiresReCaptcha={requiresReCaptcha}
        isEmbed={isEmbed}
        urlToken={urlToken}
        onModelCreated={onModelCreated}
      />
    </FormRuntimeProvider>
  );
};

export default SurveyJsWrapper;
