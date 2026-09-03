import { describe, expect, it } from "vitest";
import { SurveyCreatorModel } from "survey-creator-core";
import {
  applyFormDiagnosticsContext,
  createFormDiagnosticsContext,
  createFormDiagnosticsContextFromRuntime,
  getFormDiagnosticsPlugin,
} from "../form-diagnostics-context";
import { FORM_DIAGNOSTICS_PLUGIN_NAME } from "../constants";
import { FormDiagnosticsPlugin } from "../form-diagnostics-plugin";

describe("form-diagnostics-context", () => {
  it("builds context from designer runtime slice", () => {
    const context = createFormDiagnosticsContextFromRuntime({
      formId: "form-1",
      formName: "Games",
      folderId: "folder-9",
      isPublic: true,
      formIsEnabled: false,
    });

    expect(context.folderId).toBe("folder-9");
    expect(context.availableDataListNames).toEqual([]);
  });

  it("builds context with optional data list names", () => {
    const context = createFormDiagnosticsContext({
      isPublic: false,
      formId: "form-1",
      formName: "Games",
      formIsEnabled: true,
      availableDataListNames: ["Countries"],
    });

    expect(context.availableDataListNames).toEqual(["Countries"]);
    expect(context.formName).toBe("Games");
  });

  it("applies form context to the diagnostics plugin tab", () => {
    const creator = new SurveyCreatorModel({});
    const plugin = new FormDiagnosticsPlugin(creator);
    (creator as unknown as { addTab: (tab: unknown) => void }).addTab({
      name: FORM_DIAGNOSTICS_PLUGIN_NAME,
      plugin,
      data: plugin,
      title: "Diagnostics",
      iconName: "icon-tab-form-diagnostics",
      componentName: "svc-tab-form-diagnostics",
    });

    applyFormDiagnosticsContext(creator, {
      isPublic: true,
      formId: "form-1",
      formName: "Games survey",
      formIsEnabled: false,
      folderId: "folder-42",
      availableDataListNames: ["Countries", "Regions"],
    });

    const resolved = getFormDiagnosticsPlugin(creator);
    expect(resolved).toBe(plugin);
    expect(resolved?.isPublic).toBe(true);
    expect(resolved?.formId).toBe("form-1");
    expect(resolved?.formName).toBe("Games survey");
    expect(resolved?.formIsEnabled).toBe(false);
    expect(resolved?.folderId).toBe("folder-42");
    expect(resolved?.availableDataListNames).toEqual(["Countries", "Regions"]);
  });
});
