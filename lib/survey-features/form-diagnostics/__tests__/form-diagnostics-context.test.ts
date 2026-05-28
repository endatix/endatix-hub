import { describe, expect, it } from "vitest";
import { SurveyCreatorModel } from "survey-creator-core";
import {
  applyFormDiagnosticsContext,
  createFormDiagnosticsContext,
  createFormDiagnosticsContextFromRuntime,
  getFormDiagnosticsPlugin,
} from "../form-diagnostics-context";
import {
  FormDiagnosticsPlugin,
  FORM_DIAGNOSTICS_PLUGIN_NAME,
} from "../form-diagnostics-plugin";

describe("form-diagnostics-context", () => {
  it("builds context from designer runtime slice and data lists", () => {
    const context = createFormDiagnosticsContextFromRuntime(
      {
        formId: "form-1",
        formName: "Games",
        folderId: "folder-9",
        isPublic: true,
        formIsEnabled: false,
      },
      [
        {
          id: "1",
          name: "Countries",
          isActive: true,
          createdAt: new Date(),
          itemsCount: 0,
        },
      ],
    );

    expect(context.folderId).toBe("folder-9");
    expect(context.availableDataListNames).toEqual(["Countries"]);
  });

  it("builds context with data list names from loaded lists", () => {
    // Arrange & Act
    const context = createFormDiagnosticsContext({
      isPublic: false,
      formId: "form-1",
      formName: "Games",
      formIsEnabled: true,
      dataLists: [
        {
          id: "1",
          name: "Countries",
          isActive: true,
          createdAt: new Date(),
          itemsCount: 0,
        },
      ],
    });

    // Assert
    expect(context.availableDataListNames).toEqual(["Countries"]);
    expect(context.formName).toBe("Games");
  });

  it("applies form context to the diagnostics plugin tab", () => {
    // Arrange
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

    // Act
    applyFormDiagnosticsContext(creator, {
      isPublic: true,
      formId: "form-1",
      formName: "Games survey",
      formIsEnabled: false,
      folderId: "folder-42",
      availableDataListNames: ["Countries", "Regions"],
    });

    // Assert
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
