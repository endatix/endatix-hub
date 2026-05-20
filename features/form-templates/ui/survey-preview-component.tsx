"use client";

import { useStorageView } from "@/features/asset-storage/client";
import { useStorageReadRuntime } from "@/features/asset-storage/client";
import { useQuestionLoops } from "@/lib/survey-features/question-loops";
import { useAnyAnswered } from "@/lib/survey-features/any-answered";
import { useRichText } from "@/lib/survey-features/rich-text";
import { useLoopAwareSummaryTable } from "@/lib/survey-features/summary-table";
import { useSurveyExtensions } from "@/lib/survey-extensions";
import { FormTemplate } from "@/types";
import { useEffect, useState } from "react";
import { Model } from "survey-core";
import "survey-core/survey-core.css";
import { SharpLightPanelless } from "survey-core/themes";
import { Survey } from "survey-react-ui";

interface SurveyPreviewComponentProps {
  template: FormTemplate;
}

export default function SurveyPreviewComponent({
  template,
}: SurveyPreviewComponentProps) {
  const [model, setModel] = useState<Model | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getReadRuntime = useStorageReadRuntime({
    hubOnly: true,
    creatorTemplateId: template.id,
  });

  const { setModelMetadata, prefetchPrivateReadUrlsForModel } = useStorageView({
    getReadRuntime,
  });

  const { isReady: isExtensionsReady, onModelCreated } = useSurveyExtensions({
    runtimeDeps: {
      getRuntimeState: () => ({
        templateId: template.id,
      }),
    },
  });
  useRichText(model);
  useLoopAwareSummaryTable(model);
  const { initGlobals: initAnyAnsweredGlobals } = useAnyAnswered();
  const {
    initGlobals: initQuestionLoopsGlobals,
    bindToSurvey: bindQuestionLoops,
  } = useQuestionLoops();

  useEffect(() => {
    if (!template || !isExtensionsReady) return;

    try {
      initAnyAnsweredGlobals();
      initQuestionLoopsGlobals();
      const survey = new Model(template.jsonData);
      const unbindQuestionLoops = bindQuestionLoops(survey);

      onModelCreated(survey);

      survey.mode = "display";
      survey.showNavigationButtons = false;
      survey.showCompletedPage = false;
      survey.showProgressBar = "top";
      survey.questionsOnPageMode = "singlePage";
      survey.applyTheme(SharpLightPanelless);

      setModelMetadata(survey);
      void prefetchPrivateReadUrlsForModel(survey);

      setModel(survey);
      setError(null);

      return () => {
        unbindQuestionLoops?.();
      };
    } catch (err) {
      console.error("Error parsing survey JSON:", err);
      setError("Could not parse the form template data");
      setModel(null);
    }
  }, [
    template,
    onModelCreated,
    isExtensionsReady,
    setModelMetadata,
    prefetchPrivateReadUrlsForModel,
    initAnyAnsweredGlobals,
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
