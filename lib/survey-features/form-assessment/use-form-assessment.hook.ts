"use client";

import { useCallback } from "react";
import { SurveyCreatorModel } from "survey-creator-core";
import {
  FormAssessmentPlugin,
  FORM_ASSESSMENT_PLUGIN_NAME,
} from "./form-assessment-plugin";
import { registerFormAssessmentTab } from "./ui/form-assessment-tab";

/**
 * Hook to add the Form Assessment feature to the Survey Creator.
 */
export function useFormAssessment() {
  const initGlobals = useCallback(() => {
    registerFormAssessmentTab();
  }, []);

  const bindToCreator = useCallback((creator: SurveyCreatorModel) => {
    if (!creator) {
      return;
    }

    const plugin = new FormAssessmentPlugin(creator);
    (creator as any).addTab({
      name: FORM_ASSESSMENT_PLUGIN_NAME,
      plugin,
      data: plugin,
      title: "Assessment",
      iconName: "icon-tab-form-assessment",
      componentName: "svc-tab-form-assessment",
    });

    return () => {
      if (typeof (creator as any).removeTab === "function") {
        (creator as any).removeTab(FORM_ASSESSMENT_PLUGIN_NAME);
      } else {
        const tabIndex = creator.tabs.findIndex(
          (tab) => tab.id === FORM_ASSESSMENT_PLUGIN_NAME,
        );
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
