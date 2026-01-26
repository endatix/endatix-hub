import { useEffect } from "react";
import { SurveyInstanceCreatedEvent } from "survey-creator-core";
import { SurveyCreator } from "survey-creator-react";
import { registerDynamicLooping } from "./register-dynamic-looping";
import { registerDynamicLoopingProperties } from "./register-dynamic-looping-properties";

let isDynamicLoopingRegistered = false;

/**
 * Ensures dynamic looping properties are registered once
 */
function ensureDynamicLoopingRegistered() {
  if (isDynamicLoopingRegistered) {
    return;
  }
  registerDynamicLoopingProperties();
  isDynamicLoopingRegistered = true;
}

ensureDynamicLoopingRegistered();

/**
 * Hook to register dynamic looping for the survey creator.
 * @param surveyCreator - The survey creator to register dynamic looping for.
 * @returns void
 */
export function useQuestionLoopsEditing(surveyCreator: SurveyCreator | null) {
  useEffect(() => {
    if (!surveyCreator) {
      return;
    }

    /**
     * Disposers to clean up dynamic looping when the component unmounts.
     */
    const disposers: Array<() => void> = [];

    /**
     * Registers dynamic looping for the Preview mode (not the editing mode) of the survey creator.
     */
    const handleSurveyInstanceCreated = (
      _: unknown,
      options: SurveyInstanceCreatedEvent,
    ) => {
      if (options.area === "property-grid") {
        return;
      }

      const view = registerDynamicLooping(options.survey);
      disposers.push(view);
    };

    surveyCreator.onSurveyInstanceCreated.add(handleSurveyInstanceCreated);

    if (surveyCreator.survey) {
      const view = registerDynamicLooping(surveyCreator.survey);
      disposers.push(view);
    }

    return () => {
      surveyCreator.onSurveyInstanceCreated.remove(handleSurveyInstanceCreated);
      disposers.forEach((disposer) => disposer?.());
    };
  }, [surveyCreator]);
}
