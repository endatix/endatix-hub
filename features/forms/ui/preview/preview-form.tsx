"use client";

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

    const newCreator = new SurveyCreator(creatorOptions);
    newCreator.JSON = model;
    newCreator.activeTab = "test";
    newCreator.applyCreatorTheme(SurveyCreatorTheme.DefaultContrast);
    newCreator.theme = BorderlessLight;
    newCreator.saveSurveyFunc = (
      no: number,
      callback: (num: number, status: boolean) => void,
    ) => {
      callback(no, true);
    };
    setCreator(newCreator);
  }, [creator, model, slkVal]);

  return creator && <SurveyCreatorComponent creator={creator} />;
};

export default PreviewForm;
