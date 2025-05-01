"use client";

import { useEffect, useState } from "react";
import { SurveyCreatorComponent, SurveyCreator } from "survey-creator-react";
import "survey-core/survey-core.css";
import "survey-creator-core/survey-creator-core.css";
import { ICreatorOptions } from "survey-creator-core";
import { BorderlessLight } from "survey-core/themes";
import SurveyCreatorTheme from "survey-creator-core/themes";

interface PreviewFormProps {
  model: string;
}

const creatorOptions: ICreatorOptions = {
  showPreview: true,
  showJSONEditorTab: false,
  showTranslationTab: true,
  showDesignerTab: false,
  showLogicTab: true,
};

const PreviewForm = ({ model }: PreviewFormProps) => {
  const [creator, setCreator] = useState<SurveyCreator | null>(null);

  useEffect(() => {
    if (creator) {
      creator.JSON = model;
      return;
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
  }, [creator, model]);

  return creator && <SurveyCreatorComponent creator={creator} />;
};

export default PreviewForm;
