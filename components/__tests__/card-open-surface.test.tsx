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

function renderFormCard(onClick: () => void, showAudienceLink = false) {
  return render(
    <FormCard
      form={form}
      isSelected={false}
      showAudienceLink={showAudienceLink}
      onOpen={onClick}
      onSaveAsTemplate={vi.fn()}
    />,
  );
}

function renderTemplateCard(onClick: () => void, onPreviewClick = vi.fn()) {
  return render(
    <FormTemplateCard
      template={template}
      isSelected={false}
      onOpen={onClick}
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
  it("opens from a native button named after the card", () => {
    // Arrange
    const onOpen = vi.fn();
    renderCard(onOpen);
    const opener = screen.getByRole("button", { name: title });

    // Act
    fireEvent.click(opener);

    // Assert
    expect(opener.tagName).toBe("BUTTON");
    expect(opener.getAttribute("type")).toBe("button");
    expect(onOpen).toHaveBeenCalledTimes(1);
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

describe("FormCard audience link", () => {
  it("is a menu item that links to the audience, not a footer link", () => {
    // Arrange
    renderFormCard(vi.fn(), true);

    // Act
    fireEvent.keyDown(screen.getByRole("button", { name: "More options" }), {
      key: "Enter",
    });
    const item = screen.getByRole("menuitem", { name: "Audience" });

    // Assert
    expect(item.getAttribute("href")).toBe("/forms/1/audience");
    expect(screen.queryByRole("link", { name: "Audience" })).toBeNull();
  });

  it("is absent when the tenant has no audiences", () => {
    // Arrange
    renderFormCard(vi.fn());

    // Act
    fireEvent.keyDown(screen.getByRole("button", { name: "More options" }), {
      key: "Enter",
    });

    // Assert
    expect(
      screen.getByRole("menuitem", { name: /save as template/i }),
    ).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Audience" })).toBeNull();
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
