"use client";

import { FormTemplate } from "@/types";
import { useEffect, useState } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/defaultV2.css";

interface SurveyPreviewComponentProps {
  template: FormTemplate;
}

export default function SurveyPreviewComponent({
  template,
}: SurveyPreviewComponentProps) {
  const [model, setModel] = useState<Model | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      try {
        const surveyModel = new Model(template.jsonData);

        // Set survey to read-only mode
        surveyModel.mode = "display";

        // Disable all navigation, buttons, and editing
        surveyModel.showNavigationButtons = false;
        surveyModel.showCompletedPage = false;
        surveyModel.showProgressBar = "top";
        surveyModel.questionsOnPageMode = "singlePage";

        setModel(surveyModel);
        setError(null);
      } catch (error) {
        console.error("Error parsing survey JSON:", error);
        setError("Could not parse the form template data");
        setModel(null);
      }
    }
  }, [template]);

  if (error) {
    return <div className="text-destructive text-center">{error}</div>;
  }

  if (!model) {
    return (
      <div className="text-center text-muted-foreground">
        No preview available
      </div>
    );
  }

  return (
    <div className="survey-container mt-4">
      <Survey model={model} />
    </div>
  );
}
