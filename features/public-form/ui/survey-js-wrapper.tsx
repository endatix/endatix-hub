"use client";

import { Submission } from "@/lib/endatix-api";
import { registerAudioQuestion } from "@/lib/questions/audio-recorder";
import addRandomizeGroupFeature from "@/lib/questions/features/group-randomization";
import dynamic from "next/dynamic";

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
}

const SurveyJsWrapper = ({
  formId,
  definition,
  submission,
  theme,
  customQuestions,
  requiresReCaptcha,
  isEmbed = false,
  urlToken
}: SurveyJsWrapperProps) => {
  return (
    <SurveyComponent
      formId={formId}
      definition={definition}
      submission={submission}
      theme={theme}
      customQuestions={customQuestions}
      requiresReCaptcha={requiresReCaptcha}
      isEmbed={isEmbed}
      urlToken={urlToken}
    />
  );
};

export default SurveyJsWrapper;
