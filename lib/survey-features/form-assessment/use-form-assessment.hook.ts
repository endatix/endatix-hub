"use client";

import { useCallback } from "react";
import { SurveyCreatorModel } from "survey-creator-core";
import {
  FormAssessmentPlugin,
  FORM_ASSESSMENT_PLUGIN_NAME,
} from "./form-assessment-plugin";
import { registerFormAssessmentTab } from "./ui/form-assessment-tab";

type AssessmentTabApi = {
  addTab: (tab: {
    name: string;
    plugin: FormAssessmentPlugin;
    data: FormAssessmentPlugin;
    title: string;
    iconName: string;
    componentName: string;
  }) => void;
  removeTab?: (name: string) => void;
};

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

    const creatorWithTabs = creator as unknown as AssessmentTabApi;
    const plugin = new FormAssessmentPlugin(creator);
    creatorWithTabs.addTab({
      name: FORM_ASSESSMENT_PLUGIN_NAME,
      plugin,
      data: plugin,
      title: "Assessment",
      iconName: "icon-tab-form-assessment",
      componentName: "svc-tab-form-assessment",
    });

    return () => {
      if (typeof creatorWithTabs.removeTab === "function") {
        creatorWithTabs.removeTab(FORM_ASSESSMENT_PLUGIN_NAME);
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
