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
import { useSurveyExtensions } from "@/lib/survey-extensions";

interface SurveyPreviewComponentProps {
  template: FormTemplate;
}

export default function SurveyPreviewComponent({
  template,
}: SurveyPreviewComponentProps) {
  const [model, setModel] = useState<Model | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isReady: isExtensionsReady, onModelCreated } = useSurveyExtensions();
  useRichText(model);
  useLoopAwareSummaryTable(model);
  const { initGlobals: initQuestionLoopsGlobals, bindToSurvey: bindQuestionLoops } = useQuestionLoops();

  const { setModelMetadata, registerViewHandlers } = useStorageView();

  useEffect(() => {
    if (!template || !isExtensionsReady) return;

    try {
      initQuestionLoopsGlobals();
      const survey = new Model();
      const unbindQuestionLoops = bindQuestionLoops(survey);

      survey.JSON = template.jsonData;
      onModelCreated(survey);

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
        unbindQuestionLoops?.();
      };
    } catch (err) {
      console.error("Error parsing survey JSON:", err);
      setError("Could not parse the form template data");
      setModel(null);
    }
  }, [
    template,
    registerViewHandlers,
    onModelCreated,
    isExtensionsReady,
    setModelMetadata,
    initQuestionLoopsGlobals,
    bindQuestionLoops,
  ]);

  if (error) {
    return <div className="text-center text-destructive">{error}</div>;
  }

  if (!isExtensionsReady) {
    return (
      <div className="text-center text-muted-foreground">
        Loading preview...
      </div>
    );
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
