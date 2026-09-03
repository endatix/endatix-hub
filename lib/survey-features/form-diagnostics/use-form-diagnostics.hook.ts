"use client";

import { useDesignerRuntime } from "@/lib/designer-runtime";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { SurveyCreatorModel } from "survey-creator-core";
import {
  applyFormDiagnosticsContext,
  createFormDiagnosticsContextFromRuntime,
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
 * Adds Form Diagnostics to Survey Creator and syncs plugin context from designer runtime.
 */
export function useFormDiagnostics(creator: SurveyCreatorModel | null) {
  const { stateRef, revision } = useDesignerRuntime();
  const runtime = stateRef.current;

  const context = useMemo(
    () => createFormDiagnosticsContextFromRuntime(runtime),
    [
      revision,
      runtime.formId,
      runtime.formName,
      runtime.formIsEnabled,
      runtime.isPublic,
      runtime.folderId,
    ],
  );

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
