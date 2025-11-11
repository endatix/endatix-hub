"use client";

import { useEffect, useState } from "react";
import { SurveyCreatorComponent, SurveyCreator } from "survey-creator-react";
import "survey-core/survey-core.css";
import "survey-creator-core/survey-creator-core.css";
import { ICreatorOptions } from "survey-creator-core";
import { BorderlessLight } from "survey-core/themes";
import SurveyCreatorTheme from "survey-creator-core/themes";
import { slk } from "survey-core";
import { registerMarkdownRenderer } from "@/lib/questions/rich-text-editor/register-markdown-renderer";

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
    // Render Markdown to HTML in designer and preview
    newCreator.onSurveyInstanceCreated.add((_, options) => {
      registerMarkdownRenderer(options.survey);
    });
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
