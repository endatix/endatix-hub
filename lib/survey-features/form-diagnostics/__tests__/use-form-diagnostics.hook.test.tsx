import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SurveyCreatorModel } from "survey-creator-core";
import {
  DesignerRuntimeProvider,
  type DesignerRuntimeState,
} from "@/lib/designer-runtime";
import { getFormDiagnosticsPlugin } from "../form-diagnostics-context";
import { useFormDiagnostics } from "../use-form-diagnostics.hook";

vi.mock("../ui/form-diagnostics-tab", () => ({
  registerFormDiagnosticsTab: vi.fn(),
}));

function createWrapper(initialState: DesignerRuntimeState) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <DesignerRuntimeProvider initialState={initialState}>
        {children}
      </DesignerRuntimeProvider>
    );
  };
}

describe("useFormDiagnostics", () => {
  it("syncs diagnostics plugin from designer runtime", async () => {
    // Arrange
    const creator = new SurveyCreatorModel({});
    const wrapper = createWrapper({
      formId: "form-1",
      formName: "Games",
      folderId: "folder-42",
      isPublic: true,
      formIsEnabled: false,
    });

    // Act
    const { result } = renderHook(
      () => useFormDiagnostics(creator),
      { wrapper },
    );
    act(() => {
      result.current.bindToCreator(creator);
    });

    // Assert
    await waitFor(() => {
      const plugin = getFormDiagnosticsPlugin(creator);
      expect(plugin?.folderId).toBe("folder-42");
      expect(plugin?.formName).toBe("Games");
    });
  });
});
