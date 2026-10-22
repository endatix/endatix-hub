import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

function renderHeader() {
  return renderHook(() =>
    useFormEditorHeader({
      formId: "1",
      initialFormName: "Survey",
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

  it("keeps a name typed while the previous rename is saving", async () => {
    let resolveRename!: (result: UpdateFormNameResult) => void;
    vi.mocked(updateFormNameAction).mockReturnValue(
      new Promise((resolve) => {
        resolveRename = resolve;
      }),
    );
    const { result } = renderHeader();

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

  it("shows an error when saving the form name throws", async () => {
    vi.mocked(updateFormNameAction).mockRejectedValueOnce(
      new Error("fetch failed"),
    );
    const { result } = renderHeader();

    act(() => result.current.setName("Survey v2"));
    await act(async () => {
      result.current.handleNameSave();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Failed to update form name: Something went wrong. Try again.",
    );
    expect(toast.success).not.toHaveBeenCalled();
  });
});
