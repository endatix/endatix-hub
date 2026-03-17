"use client";

import { useCallback } from "react";
import { SurveyCreatorModel } from "survey-creator-core";
import { SurveyAssessmentPlugin, ASSESSMENT_PLUGIN_NAME } from "./survey-assessment-plugin";
import { registerSurveyAssessmentTab } from "./ui/survey-assessment-tab";

/**
 * Hook to add the Survey Assessment feature to the Survey Creator.
 */
export function useSurveyAssessment() {
  /**
   * Registers globals and the tab component. Call once before creating the Creator.
   */
  const initGlobals = useCallback(() => {
    registerSurveyAssessmentTab();
  }, []);

  /**
   * Binds the survey assessment feature to a survey creator.
   * @param creator - The survey creator to bind the feature to.
   * @returns A function to clean up the feature from the survey creator.
   */
  const bindToCreator = useCallback((creator: SurveyCreatorModel) => {
    if (!creator) {
      return;
    }

    const plugin = new SurveyAssessmentPlugin(creator);
    creator.addTab({
        name: ASSESSMENT_PLUGIN_NAME,
        plugin: plugin,
        data: plugin,
        title: "Assessment",
        iconName: "icon-tab-assessment",
        componentName: "svc-tab-assessment"
    });

    return () => {
      // Remove the tab from the creator if a removal method is available,
      // or manually from the tabs array as a fallback.
      if (typeof (creator as any).removeTab === "function") {
          (creator as any).removeTab(ASSESSMENT_PLUGIN_NAME);
      } else {
          const tabIndex = creator.tabs.findIndex((tab) => tab.id === ASSESSMENT_PLUGIN_NAME);
          if (tabIndex !== -1) {
              creator.tabs.splice(tabIndex, 1);
          }
      }
    };
  }, []);

  return {
    initGlobals,
    bindToCreator,
  };
}
