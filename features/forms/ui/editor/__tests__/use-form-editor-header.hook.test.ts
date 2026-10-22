import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "@/components/ui/toast";
import { updateFormNameAction } from "@/features/forms/application/actions/update-form-name.action";
import { useFormEditorHeader } from "../use-form-editor-header.hook";

vi.mock("@/components/ui/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/features/forms/application/actions/update-form-name.action", () => ({
  updateFormNameAction: vi.fn(),
}));

vi.mock("@/lib/survey-features/designer/design-survey.context", () => ({
  useSurveyDesigner: () => ({
    hasUnsavedChanges: false,
    hasJsonErrors: false,
    isOnJsonTab: false,
    isJsonModified: false,
  }),
}));

function renderHeader() {
  return renderHook(() =>
    useFormEditorHeader({
      formId: "1",
      initialFormName: "Customer survey",
      isCurrentThemeModified: false,
      onSave: vi.fn(),
      onNavigateBack: vi.fn(),
    }),
  );
}

describe("useFormEditorHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an error when saving the form name throws", async () => {
    vi.mocked(updateFormNameAction).mockRejectedValueOnce(
      new Error("fetch failed"),
    );
    const { result } = renderHeader();

    act(() => {
      result.current.setName("Customer feedback");
    });
    await act(async () => {
      result.current.handleNameSave();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Failed to update form name: Something went wrong. Try again.",
    );
    expect(toast.success).not.toHaveBeenCalled();
  });
});
