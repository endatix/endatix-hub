import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RICH_TEXT_EDITOR_TYPE } from "../ui/rich-text-editor.model";
import { useRichTextEditing } from "../use-rich-text-editing.hook";

vi.mock("../register-markdown-renderer", () => ({
  registerMarkdownRenderer: vi.fn(() => vi.fn()),
}));

describe("useRichTextEditing", () => {
  it("removes rich text editor from toolbox when creator is set", () => {
    const removeItem = vi.fn();
    const mockCreator = {
      toolbox: { removeItem },
      onSurveyInstanceCreated: { add: vi.fn(), remove: vi.fn() },
      survey: null,
    };

    renderHook(() => useRichTextEditing(mockCreator as any));

    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(removeItem).toHaveBeenCalledWith(RICH_TEXT_EDITOR_TYPE);
  });

  it("does not call toolbox when creator is null", () => {
    const removeItem = vi.fn();

    renderHook(() => useRichTextEditing(null));

    expect(removeItem).not.toHaveBeenCalled();
  });
});
