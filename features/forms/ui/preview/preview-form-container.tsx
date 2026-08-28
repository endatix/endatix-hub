"use client";

import dynamic from "next/dynamic";
import { useSurveyLicenseKey } from "@/features/config/survey-license-provider";

const PreviewForm = dynamic(
  () => import("@/features/forms/ui/preview/preview-form"),
  {
    ssr: false,
  },
);

interface PreviewFormContainerProps {
  model: string;
}

const PreviewFormContainer = ({ model }: PreviewFormContainerProps) => {
  const surveyLicenseKey = useSurveyLicenseKey();
  return <PreviewForm model={model} slkVal={surveyLicenseKey} />;
};

export default PreviewFormContainer;
