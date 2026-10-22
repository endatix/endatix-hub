import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";
import {
  updateFormNameAction,
  type UpdateFormNameResult,
} from "@/features/forms/application/actions/update-form-name.action";
import { useFormEditorHeader } from "../use-form-editor-header.hook";

vi.mock("@/components/ui/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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

describe("useFormEditorHeader", () => {
  it("keeps a name typed while the previous rename is saving", async () => {
    let resolveRename!: (result: UpdateFormNameResult) => void;
    vi.mocked(updateFormNameAction).mockReturnValue(
      new Promise((resolve) => {
        resolveRename = resolve;
      }),
    );
    const { result } = renderHook(() =>
      useFormEditorHeader({
        formId: "1",
        initialFormName: "Survey",
        isCurrentThemeModified: false,
        onSave: vi.fn(),
        onNavigateBack: vi.fn(),
      }),
    );

    act(() => result.current.setName("Survey v2"));
    await act(async () => {
      result.current.handleNameSave();
    });
    act(() => {
      result.current.setIsEditingName(true);
      result.current.setName("Survey v3");
    });
    await act(async () => resolveRename(Result.success("Survey v2")));

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(toast.success).toHaveBeenCalledWith("Form name updated");
    expect(result.current.name).toBe("Survey v3");
  });
});
