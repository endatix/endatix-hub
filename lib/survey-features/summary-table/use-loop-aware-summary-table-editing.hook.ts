import { useEffect } from "react";
import { SurveyInstanceCreatedEvent } from "survey-creator-core";
import { SurveyCreator } from "survey-creator-react";
import { registerLoopAwareSummaryTable } from "./register-loop-aware-summary-table";

/**
 * Hook to register the Loop Aware Summary Table.
 * @param surveyCreator - The survey creator to register the Loop Aware Summary Table for.
 * @returns void
 */
export function useLoopAwareSummaryTableEditing(surveyCreator: SurveyCreator | null) {
  useEffect(() => {
    if (!surveyCreator) {
      return;
    }

    /**
     * Disposers to clean up the Loop Aware Summary Table when the component unmounts.
     */
    const disposers: Array<() => void> = [];

    /**
     * Registers the Loop Aware Summary Table for the Preview mode (not the editing mode) of the survey creator.
     */
    const handleSurveyInstanceCreated = (
      _: unknown,
      options: SurveyInstanceCreatedEvent,
    ) => {
      if (options.area === "property-grid") {
        return;
      }
      
      const view = registerLoopAwareSummaryTable(options.survey);
      disposers.push(view);
    };

    surveyCreator.onSurveyInstanceCreated.add(handleSurveyInstanceCreated);

    if (surveyCreator.survey) {
      const view = registerLoopAwareSummaryTable(surveyCreator.survey);
      disposers.push(view);
    }

    return () => {
      surveyCreator.onSurveyInstanceCreated.remove(handleSurveyInstanceCreated);
      disposers.forEach((disposer) => disposer?.());
    };
  }, [surveyCreator]);
}
