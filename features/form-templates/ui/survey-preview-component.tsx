"use client";

import { useQuestionLoops } from "@/lib/survey-features/question-loops";
import { useRichText } from "@/lib/survey-features/rich-text";
import { useLoopAwareSummaryTable } from "@/lib/survey-features/summary-table";
import { FormTemplate } from "@/types";
import { useEffect, useState } from "react";
import { Model } from "survey-core";
import "survey-core/survey-core.css";
import { SharpLightPanelless } from "survey-core/themes";
import { Survey } from "survey-react-ui";
import { useStorageView } from "@/features/asset-storage/client";

interface SurveyPreviewComponentProps {
  template: FormTemplate;
}

export default function SurveyPreviewComponent({
  template,
}: SurveyPreviewComponentProps) {
  const [model, setModel] = useState<Model | null>(null);
  const [error, setError] = useState<string | null>(null);
  useRichText(model);
  useLoopAwareSummaryTable(model);
  useQuestionLoops(model);

  const { setModelMetadata, registerViewHandlers } = useStorageView();

  useEffect(() => {
    if (template) {
      try {
        const survey = new Model(template.jsonData);

        // Set survey to read-only mode
        survey.mode = "display";

        // Disable all navigation, buttons, and editing
        survey.showNavigationButtons = false;
        survey.showCompletedPage = false;
        survey.showProgressBar = "top";
        survey.questionsOnPageMode = "singlePage";

        // Apply theme
        survey.applyTheme(SharpLightPanelless);

        setModelMetadata(survey);
        const unregisterView = registerViewHandlers(survey);

        setModel(survey);
        setError(null);

        return () => {
          unregisterView();
        };
      } catch (error) {
        console.error("Error parsing survey JSON:", error);
        setError("Could not parse the form template data");
        setModel(null);
      }
    }
  }, [template, setModelMetadata, registerViewHandlers]);

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
