"use client";

import { Submission } from "@/lib/endatix-api";
import { registerAudioQuestion } from "@/lib/questions/audio-recorder";
import addRandomizeGroupFeature from "@/lib/questions/features/group-randomization";
import dynamic from "next/dynamic";
import { ReadTokensResult } from "@/features/storage/types";

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
  readTokenPromises?: {
    userFiles: Promise<ReadTokensResult>;
    content: Promise<ReadTokensResult>;
  };
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
  readTokenPromises,
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
      readTokenPromises={readTokenPromises}
    />
  );
};

export default SurveyJsWrapper;
