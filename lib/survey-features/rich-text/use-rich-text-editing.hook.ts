import { useEffect } from "react";
import { SurveyCreator } from "survey-creator-react";
import { registerMarkdownRenderer } from "./register-markdown-renderer";
import registerRichTextEditor from "@/lib/survey-features/rich-text/rich-text-editor";
import { SurveyInstanceCreatedEvent } from "survey-creator-core";

let isRichTextRegistered = false;

/**
 * Registers the rich text editor for the survey creator is registered once
 */
function ensureRichTextRegistered() {
  if (isRichTextRegistered) {
    return;
  }
  registerRichTextEditor();
  isRichTextRegistered = true;
}

ensureRichTextRegistered();

/**
 * Hook to register the markdown renderer for the survey creator.
 * @param surveyCreator - The survey creator to register the markdown renderer for.
 * @returns void
 */
export function useRichTextEditing(surveyCreator: SurveyCreator | null) {
  useEffect(() => {
    if (!surveyCreator) {
      return;
    }

    /**
     * Disposers to clean up the markdown renderer when the component unmounts.
     */
    const disposers: Array<() => void> = [];

    /**
     * Registers the markdown renderer for the Preview mode (not the editing mode) of the survey creator.
     */
    const handleSurveyInstanceCreated = (
      _: unknown,
      options: SurveyInstanceCreatedEvent,
    ) => {
      if (options.area === "property-grid") {
        return;
      }

      const view = registerMarkdownRenderer(options.survey);
      disposers.push(view);
    };

    surveyCreator.onSurveyInstanceCreated.add(handleSurveyInstanceCreated);

    if (surveyCreator.survey) {
      const view = registerMarkdownRenderer(surveyCreator.survey);
      disposers.push(view);
    }

    return () => {
      surveyCreator.onSurveyInstanceCreated.remove(handleSurveyInstanceCreated);
      disposers.forEach((disposer) => disposer?.());
    };
  }, [surveyCreator]);
}
