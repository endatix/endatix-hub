import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createNextNavigationMock } from "@/__tests__/utils/mock-next";
import CreateFormWizard from "../create-form-wizard";

vi.mock("next/navigation", () =>
  createNextNavigationMock({
    useRouter: vi.fn(() => ({ push: vi.fn() })),
  }),
);

vi.mock("../create-form.action", () => ({
  createFormAction: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("CreateFormWizard", () => {
  it("calls onCancel from the Cancel button", () => {
    // Arrange
    const onCancel = vi.fn();
    render(<CreateFormWizard onCancel={onCancel} />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Assert
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("renders a cancel link to cancelHref when no onCancel is given", () => {
    // Arrange
    render(<CreateFormWizard cancelHref="/forms/folders/oggys-tests" />);

    // Act
    const cancelLink = screen.getByRole("link", { name: "Cancel" });

    // Assert
    expect(cancelLink.getAttribute("href")).toBe("/forms/folders/oggys-tests");
  });
});
