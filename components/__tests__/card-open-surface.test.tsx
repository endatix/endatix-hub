import { createPortal } from "react-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Form, FormTemplate } from "@/types";
import FormCard from "@/features/forms/ui/form-card";
import FormTemplateCard from "@/features/form-templates/ui/form-template-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/features/folders/move-to-folder/move-item-to-folder", () => ({
  loadFolderChoices: vi.fn(),
  moveItemToFolder: vi.fn(),
}));

vi.mock(
  "@/features/form-templates/application/run-create-form-from-template.client",
  () => ({ runCreateFormFromTemplate: vi.fn() }),
);

// The dialogs render in a portal, as the real ones do, so their clicks reach the card only through the React tree.
vi.mock("@/features/forms/ui/delete-form-confirm", () => ({
  DeleteFormConfirm: () =>
    createPortal(<input aria-label="Confirm form name" />, document.body),
}));

vi.mock("@/features/folders/move-to-folder/ui/move-to-folder-dialog", () => ({
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

const template = {
  id: "7",
  name: "Onboarding",
  description: "New hire checklist",
} as FormTemplate;

function renderFormCard(onClick: () => void) {
  return render(
    <FormCard
      form={form}
      isSelected={false}
      onClick={onClick}
      onSaveAsTemplate={vi.fn()}
    />,
  );
}

function renderTemplateCard(onClick: () => void, onPreviewClick = vi.fn()) {
  return render(
    <FormTemplateCard
      template={template}
      isSelected={false}
      onClick={onClick}
      onPreviewClick={onPreviewClick}
    />,
  );
}

describe.each([
  { card: "FormCard", title: "Customer survey", renderCard: renderFormCard },
  {
    card: "FormTemplateCard",
    title: "Onboarding",
    renderCard: renderTemplateCard,
  },
])("$card", ({ title, renderCard }) => {
  it("opens when its body is clicked or activated from the keyboard", () => {
    // Arrange
    const onClick = vi.fn();
    renderCard(onClick);
    const surface = screen.getByRole("button", {
      name: new RegExp(title, "i"),
    });

    // Act
    fireEvent.click(screen.getByText(title));
    fireEvent.keyDown(surface, { key: "Enter" });
    fireEvent.keyDown(surface, { key: " " });

    // Assert
    expect(onClick).toHaveBeenCalledTimes(3);
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
});

describe("FormCard", () => {
  it("keeps a click inside the delete dialog off the card", () => {
    // Arrange
    const onClick = vi.fn();
    renderFormCard(onClick);

    // Act
    fireEvent.click(screen.getByRole("textbox", { name: "Confirm form name" }));

    // Assert
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps a click on a footer link off the card", () => {
    // Arrange
    const onClick = vi.fn();
    renderFormCard(onClick);

    // Act
    fireEvent.click(screen.getByRole("link", { name: /design/i }));

    // Assert
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("FormTemplateCard", () => {
  it("previews without opening the template", () => {
    // Arrange
    const onClick = vi.fn();
    const onPreviewClick = vi.fn();
    renderTemplateCard(onClick, onPreviewClick);

    // Act
    fireEvent.click(screen.getByRole("button", { name: /preview/i }));

    // Assert
    expect(onPreviewClick).toHaveBeenCalledWith("7");
    expect(onClick).not.toHaveBeenCalled();
  });
});
