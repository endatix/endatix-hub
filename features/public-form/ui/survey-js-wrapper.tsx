"use client";

import { Submission } from "@/lib/endatix-api";
import { registerAudioQuestion } from '@/lib/questions/audio-recorder';
import dynamic from "next/dynamic";

const SurveyComponent = dynamic(() => import("./survey-component"), {
  ssr: false,
});

registerAudioQuestion();

interface SurveyJsWrapperProps {
  definition: string;
  formId: string;
  submission?: Submission | undefined;
  theme?: string;
  customQuestions?: string[];
  requiresReCaptcha?: boolean;
}

const SurveyJsWrapper = ({
  formId,
  definition,
  submission,
  theme,
  customQuestions,
  requiresReCaptcha,
}: SurveyJsWrapperProps) => {
  return (
    <SurveyComponent
      formId={formId}
      definition={definition}
      submission={submission}
      theme={theme}
      customQuestions={customQuestions}
      requiresReCaptcha={requiresReCaptcha}
    />
  );
};

export default SurveyJsWrapper;
