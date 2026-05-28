"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { SurveyCreatorModel } from "survey-creator-core";
import {
  applyFormDiagnosticsContext,
  createFormDiagnosticsContext,
  type FormDiagnosticsContextInput,
} from "./form-diagnostics-context";
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
 * Syncs form-level context onto the diagnostics plugin when creator or context changes.
 */
export function useFormDiagnostics(
  creator: SurveyCreatorModel | null,
  input: FormDiagnosticsContextInput,
) {
  const context = useMemo(() => createFormDiagnosticsContext(input), [input]);

  const contextRef = useRef(context);
  contextRef.current = context;

  const initGlobals = useCallback(() => {
    registerFormDiagnosticsTab();
  }, []);

  const bindToCreator = useCallback((boundCreator: SurveyCreatorModel) => {
    if (!boundCreator) {
      return;
    }

    const creatorWithTabs = boundCreator as unknown as DiagnosticsTabApi;
    const plugin = new FormDiagnosticsPlugin(boundCreator);
    creatorWithTabs.addTab({
      name: FORM_DIAGNOSTICS_PLUGIN_NAME,
      plugin,
      data: plugin,
      title: "Diagnostics",
      iconName: "icon-tab-form-diagnostics",
      componentName: "svc-tab-form-diagnostics",
    });

    applyFormDiagnosticsContext(boundCreator, contextRef.current);

    return () => {
      if (typeof creatorWithTabs.removeTab === "function") {
        creatorWithTabs.removeTab(FORM_DIAGNOSTICS_PLUGIN_NAME);
      } else {
        const tabIndex = boundCreator.tabs.findIndex((tab) => {
          const tabWithName = tab as { id?: string; name?: string };
          return (
            tabWithName.id === FORM_DIAGNOSTICS_PLUGIN_NAME ||
            tabWithName.name === FORM_DIAGNOSTICS_PLUGIN_NAME
          );
        });
        if (tabIndex !== -1) {
          boundCreator.tabs.splice(tabIndex, 1);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!creator) {
      return;
    }
    applyFormDiagnosticsContext(creator, context);
  }, [creator, context]);

  return {
    initGlobals,
    bindToCreator,
  };
}
