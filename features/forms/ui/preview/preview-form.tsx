"use client";

import { useQuestionLoops } from "@/lib/survey-features/question-loops";
import { useAnyAnswered } from "@/lib/survey-features/any-answered";
import { useRichTextEditing } from "@/lib/survey-features/rich-text";
import { useLoopAwareSummaryTableEditing } from "@/lib/survey-features/summary-table";
import { useSurveyExtensions } from "@/lib/survey-extensions/ui/use-survey-extensions";
import { applyEndatixCreatorTheme } from "@/lib/themes/creator-theme";
import { registerThemes } from "@/lib/themes/survey-theme";
import { useEndatixCreatorTheme } from "@/lib/themes/use-endatix-themes";
import { useEffect, useState } from "react";
import { slk } from "survey-core";
import "survey-core/survey-core.css";
import { BorderlessLight } from "survey-core/themes";
import { ICreatorOptions } from "survey-creator-core";
import "survey-creator-core/survey-creator-core.css";
import { SurveyCreator, SurveyCreatorComponent } from "survey-creator-react";

registerThemes();

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
  const creatorTheme = useEndatixCreatorTheme();
  useRichTextEditing(creator);
  useLoopAwareSummaryTableEditing(creator);
  const { isReady: isExtensionsReady, onCreatorCreated } = useSurveyExtensions({
    runtimeDeps: {
      getRuntimeState: () => ({}),
    },
  });
  const { initGlobals: initAnyAnsweredGlobals } = useAnyAnswered();
  const {
    initGlobals: initQuestionLoopsGlobals,
    bindToCreator: bindQuestionLoops,
  } = useQuestionLoops();

  useEffect(() => {
    if (!isExtensionsReady) {
      return;
    }

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
    newCreator.theme = BorderlessLight;

    onCreatorCreated(newCreator);
    setCreator(newCreator);

    return () => {
      cleanupQuestionLoops?.();
    };
  }, [
    creator,
    model,
    slkVal,
    isExtensionsReady,
    onCreatorCreated,
    initAnyAnsweredGlobals,
    initQuestionLoopsGlobals,
    bindQuestionLoops,
  ]);

  useEffect(() => {
    if (!creator) {
      return;
    }

    applyEndatixCreatorTheme(creator, creatorTheme);
  }, [creator, creatorTheme]);

  if (!isExtensionsReady) {
    return null;
  }

  return creator && <SurveyCreatorComponent creator={creator} />;
};

export default PreviewForm;
