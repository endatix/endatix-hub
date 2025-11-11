import { useEffect } from "react";
import { SurveyModel } from "survey-core";
import { registerMarkdownRenderer } from "@/lib/questions/rich-text-editor/register-markdown-renderer";

interface UseRichTextProps {
  surveyModel: SurveyModel | null;
}

export function useRichText({ surveyModel }: UseRichTextProps) {
  useEffect(() => {
    if (!surveyModel) return;

    return registerMarkdownRenderer(surveyModel);
  }, [surveyModel]);
}