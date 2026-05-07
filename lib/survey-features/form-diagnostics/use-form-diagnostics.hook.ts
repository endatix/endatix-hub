"use client";

import { useCallback } from "react";
import { SurveyCreatorModel } from "survey-creator-core";
import {
  FormDiagnosticsPlugin,
  FORM_DIAGNOSTICS_PLUGIN_NAME,
} from "./form-diagnostics-plugin";
import { registerFormDiagnosticsTab } from "./ui/form-diagnostics-tab";

type DiagnosticsTabApi = {
  addTab: (tab: {
    name: string;
    plugin: FormDiagnosticsPlugin;
    data: FormDiagnosticsPlugin;
    title: string;
    iconName: string;
    componentName: string;
  }) => void;
  removeTab?: (name: string) => void;
};

/**
 * Hook to add the Form Diagnostics feature to the Survey Creator.
 */
export function useFormDiagnostics() {
  const initGlobals = useCallback(() => {
    registerFormDiagnosticsTab();
  }, []);

  const bindToCreator = useCallback((creator: SurveyCreatorModel) => {
    if (!creator) {
      return;
    }

    const creatorWithTabs = creator as unknown as DiagnosticsTabApi;
    const plugin = new FormDiagnosticsPlugin(creator);
    creatorWithTabs.addTab({
      name: FORM_DIAGNOSTICS_PLUGIN_NAME,
      plugin,
      data: plugin,
      title: "Diagnostics",
      iconName: "icon-tab-form-diagnostics",
      componentName: "svc-tab-form-diagnostics",
    });

    return () => {
      if (typeof creatorWithTabs.removeTab === "function") {
        creatorWithTabs.removeTab(FORM_DIAGNOSTICS_PLUGIN_NAME);
      } else {
        const tabIndex = creator.tabs.findIndex(
          (tab) => {
            const tabWithName = tab as { id?: string; name?: string };
            return (
              tabWithName.id === FORM_DIAGNOSTICS_PLUGIN_NAME ||
              tabWithName.name === FORM_DIAGNOSTICS_PLUGIN_NAME
            );
          },
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
