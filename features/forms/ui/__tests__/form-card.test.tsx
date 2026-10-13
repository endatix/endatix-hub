import { createPortal } from "react-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Form } from "@/types";
import FormCard from "../form-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/features/folders/server", () => ({
  listFoldersAction: vi.fn(),
}));

vi.mock("@/features/folders/move-form-to-folder", () => ({
  moveFormToFolderAction: vi.fn(),
}));

// Both dialogs render in a portal, as the real ones do, so their clicks reach the card only through the React tree.
vi.mock("@/features/forms/ui/delete-form-confirm", () => ({
  DeleteFormConfirm: () =>
    createPortal(<input aria-label="Confirm form name" />, document.body),
}));

vi.mock("@/features/folders/ui/move-to-folder-dialog", () => ({
  NO_FOLDER_VALUE: "__none__",
  MoveToFolderDialog: () =>
    createPortal(<button type="button">Move</button>, document.body),
}));

const form = {
  id: "1",
  name: "Customer survey",
  isEnabled: true,
  isPublic: false,
  submissionsCount: 3,
} as Form;

function renderCard(onClick: () => void) {
  return render(
    <FormCard
      form={form}
      isSelected={false}
      onClick={onClick}
      onSaveAsTemplate={vi.fn()}
    />,
  );
}

describe("FormCard", () => {
  it("opens the form when its body is clicked or activated from the keyboard", () => {
    // Arrange
    const onClick = vi.fn();
    renderCard(onClick);

    // Act
    fireEvent.click(screen.getByText("Customer survey"));
    fireEvent.keyDown(screen.getByRole("button", { name: /customer survey/i }), {
      key: "Enter",
    });

    // Assert
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("keeps a click inside the delete dialog off the card", () => {
    // Arrange
    const onClick = vi.fn();
    renderCard(onClick);

    // Act
    fireEvent.click(screen.getByRole("textbox", { name: "Confirm form name" }));

    // Assert
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps a click inside the move dialog off the card", () => {
    // Arrange
    const onClick = vi.fn();
    renderCard(onClick);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    // Assert
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps a click on a footer link off the card", () => {
    // Arrange
    const onClick = vi.fn();
    renderCard(onClick);

    // Act
    fireEvent.click(screen.getByRole("link", { name: /design/i }));

    // Assert
    expect(onClick).not.toHaveBeenCalled();
  });
});
