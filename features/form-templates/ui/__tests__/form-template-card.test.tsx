import { createPortal } from "react-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FormTemplate } from "@/types";
import FormTemplateCard from "../form-template-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/features/folders/server", () => ({
  listFoldersAction: vi.fn(),
}));

vi.mock("@/features/folders/move-template-to-folder", () => ({
  moveTemplateToFolderAction: vi.fn(),
}));

vi.mock("../../application/run-create-form-from-template.client", () => ({
  runCreateFormFromTemplate: vi.fn(),
}));

// The dialog renders in a portal, as the real one does, so its clicks reach the card only through the React tree.
vi.mock("@/features/folders/ui/move-to-folder-dialog", () => ({
  NO_FOLDER_VALUE: "__none__",
  MoveToFolderDialog: () =>
    createPortal(<button type="button">Move</button>, document.body),
}));

const template = {
  id: "7",
  name: "Onboarding",
  description: "New hire checklist",
} as FormTemplate;

describe("FormTemplateCard", () => {
  it("opens the template when its body is clicked", () => {
    // Arrange
    const onClick = vi.fn();
    render(
      <FormTemplateCard
        template={template}
        isSelected={false}
        onClick={onClick}
      />,
    );

    // Act
    fireEvent.click(screen.getByText("Onboarding"));
    fireEvent.keyDown(screen.getByRole("button", { name: /onboarding/i }), {
      key: " ",
    });

    // Assert
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("keeps a click inside the move dialog off the card", () => {
    // Arrange
    const onClick = vi.fn();
    render(
      <FormTemplateCard
        template={template}
        isSelected={false}
        onClick={onClick}
      />,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    // Assert
    expect(onClick).not.toHaveBeenCalled();
  });

  it("previews without opening the template", () => {
    // Arrange
    const onClick = vi.fn();
    const onPreviewClick = vi.fn();
    render(
      <FormTemplateCard
        template={template}
        isSelected={false}
        onClick={onClick}
        onPreviewClick={onPreviewClick}
      />,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));

    // Assert
    expect(onPreviewClick).toHaveBeenCalledWith("7");
    expect(onClick).not.toHaveBeenCalled();
  });
});
