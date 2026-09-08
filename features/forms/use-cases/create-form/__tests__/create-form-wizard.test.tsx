import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createNextNavigationMock } from "@/__tests__/utils/mock-next";
import { createFormAction } from "../create-form.action";
import CreateFormWizard from "../create-form-wizard";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () =>
  createNextNavigationMock({
    useRouter: vi.fn(() => ({ push })),
  }),
);

vi.mock("../create-form.action", () => ({
  createFormAction: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const createFormActionMock = vi.mocked(createFormAction);

async function submitSuccessfulCreate(onCancel: () => void = vi.fn()) {
  createFormActionMock.mockResolvedValue({
    isSuccess: true,
    formId: "form-1",
  } as never);

  const view = render(<CreateFormWizard onCancel={onCancel} />);
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "My form" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create Form" }));
  await screen.findByText("Form created successfully!");
  return view;
}

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

  it("disables Cancel and Create Form after a successful create", async () => {
    // Arrange
    await submitSuccessfulCreate();

    // Assert
    expect(
      (screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Create Form" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("navigates to the designer after a successful create", async () => {
    // Arrange
    push.mockClear();
    await submitSuccessfulCreate();

    // Assert
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/forms/form-1/design");
    });
  });

  it("does not navigate to the designer if the wizard unmounts after create", async () => {
    // Arrange
    push.mockClear();
    const { unmount } = await submitSuccessfulCreate();

    // Act
    unmount();

    // Assert
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
    expect(push).not.toHaveBeenCalled();
  });
});
