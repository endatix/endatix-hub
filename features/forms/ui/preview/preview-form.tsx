"use client";

import { useQuestionLoops } from "@/lib/survey-features/question-loops";
import { useAnyAnswered } from "@/lib/survey-features/any-answered";
import { useRichTextEditing } from "@/lib/survey-features/rich-text";
import { useLoopAwareSummaryTableEditing } from "@/lib/survey-features/summary-table";
import { useEffect, useState } from "react";
import { slk } from "survey-core";
import "survey-core/survey-core.css";
import { BorderlessLight } from "survey-core/themes";
import { ICreatorOptions } from "survey-creator-core";
import "survey-creator-core/survey-creator-core.css";
import SurveyCreatorTheme from "survey-creator-core/themes";
import { SurveyCreator, SurveyCreatorComponent } from "survey-creator-react";

interface PreviewFormProps {
  model: string;
  slkVal: string | undefined;
}

const creatorOptions: ICreatorOptions = {
  showPreview: true,
  showJSONEditorTab: false,
  showTranslationTab: true,
  showDesignerTab: false,
  showLogicTab: true,
};

const PreviewForm = ({ model, slkVal }: PreviewFormProps) => {
  const [creator, setCreator] = useState<SurveyCreator | null>(null);
  useRichTextEditing(creator);
  useLoopAwareSummaryTableEditing(creator);
  const { initGlobals: initAnyAnsweredGlobals } = useAnyAnswered();
  const { initGlobals: initQuestionLoopsGlobals, bindToCreator: bindQuestionLoops } = useQuestionLoops();

  useEffect(() => {
    if (creator) {
      if (model && Object.keys(model).length > 0) {
        creator.JSON = model;
      }
      return;
    }

    if (slkVal) {
      slk(slkVal);
    }

    initAnyAnsweredGlobals();
    initQuestionLoopsGlobals();
    const newCreator = new SurveyCreator(creatorOptions);
    const cleanupQuestionLoops = bindQuestionLoops(newCreator);
    newCreator.JSON = model;
    newCreator.activeTab = "test";
    newCreator.applyCreatorTheme(SurveyCreatorTheme.DefaultContrast);
    newCreator.theme = BorderlessLight;
    
    setCreator(newCreator);

    return () => {
      cleanupQuestionLoops?.();
    }
  }, [creator, model, slkVal, initAnyAnsweredGlobals, initQuestionLoopsGlobals, bindQuestionLoops]);

  return creator && <SurveyCreatorComponent creator={creator} />;
};

export default PreviewForm;
