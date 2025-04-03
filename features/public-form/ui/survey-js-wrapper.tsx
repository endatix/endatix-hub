"use client";

import { StoredTheme } from '@/app/api/hub/v0/themes/repository';
import { Submission } from "@/types";
import dynamic from "next/dynamic";

const SurveyComponent = dynamic(() => import("./survey-component"), {
  ssr: false,
});

interface SurveyJsWrapperProps {
  definition: string;
  formId: string;
  submission?: Submission | undefined;
  theme?: StoredTheme;
}

const SurveyJsWrapper = ({
  formId,
  definition,
  submission,
  theme,
}: SurveyJsWrapperProps) => {
  return (
    <SurveyComponent
      formId={formId}
      definition={definition}
      submission={submission}
      theme={theme}
    />
  );
};

export default SurveyJsWrapper;
