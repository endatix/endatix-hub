import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FormDetails from "../form-details";

const mockUpdateFormSettingsAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../application/actions/update-form-status.action", () => ({
  updateFormStatusAction: vi.fn(),
}));

vi.mock("../../application/actions/update-form-visibility.action", () => ({
  updateFormVisibilityAction: vi.fn(),
}));

vi.mock("../../application/actions/update-form-settings.action", () => ({
  updateFormSettingsAction: (...args: unknown[]) =>
    mockUpdateFormSettingsAction(...args),
}));

vi.mock("../../application/actions/get-tenant-settings.action", () => ({
  getTenantSettingsAction: vi.fn().mockResolvedValue({
    kind: 0,
    value: { submissionTokenExpiryHours: null },
  }),
}));

vi.mock("../../application/actions/delete-form.action", () => ({
  deleteFormAction: vi.fn(),
}));

vi.mock("@/features/folders/server", () => ({
  listFoldersAction: vi.fn().mockResolvedValue({ kind: 0, value: [] }),
}));

vi.mock("../webhook-settings", () => ({
  WebhookSettings: () => <div data-testid="webhook-settings" />,
}));

vi.mock("../share-dialog", () => ({
  ShareDialog: () => <div data-testid="share-dialog" />,
}));

vi.mock("../save-as-template-dialog", () => ({
  SaveAsTemplateDialog: () => <div data-testid="save-as-template-dialog" />,
}));

describe("FormDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateFormSettingsAction.mockResolvedValue({
      kind: 0,
      value: "form-1",
    });
  });

  it("disables limit one per user switch when already enabled", () => {
    // Arrange
    const form = {
      id: "form-1",
      name: "Form",
      isEnabled: true,
      isPublic: false,
      limitOnePerUser: true,
      folderId: null,
      createdAt: new Date(),
    };

    // Act
    render(<FormDetails form={form} enableEditing />);
    const switchElement = document.getElementById("form-limit-one");

    // Assert
    expect(switchElement).toBeDefined();
    expect(switchElement?.hasAttribute("disabled")).toBe(true);
  });

  it("shows irreversible warning confirmation before enabling", async () => {
    // Arrange
    const form = {
      id: "form-1",
      name: "Form",
      isEnabled: true,
      isPublic: false,
      limitOnePerUser: false,
      folderId: null,
      createdAt: new Date(),
    };

    render(<FormDetails form={form} enableEditing />);
    const switchElement = document.getElementById("form-limit-one");

    // Act
    fireEvent.click(switchElement!);

    // Assert
    expect(
      screen.getByText(
        /After you turn this on, each signed-in person can submit this form only once\./,
        { selector: "p" },
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        "To protect the integrity of collected responses, this setting is permanent.",
        { selector: "strong" },
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        "You will also not be able to make the form public later.",
        { selector: "strong" },
      ),
    ).toBeDefined();
    expect(mockUpdateFormSettingsAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Enable permanently"));

    await waitFor(() => {
      expect(mockUpdateFormSettingsAction).toHaveBeenCalledWith("form-1", {
        limitOnePerUser: true,
      });
    });
  });

  it("disables visibility toggle when single submission is enabled", () => {
    // Arrange
    const form = {
      id: "form-1",
      name: "Form",
      isEnabled: true,
      isPublic: false,
      limitOnePerUser: true,
      folderId: null,
      createdAt: new Date(),
    };

    render(<FormDetails form={form} enableEditing />);
    const switchElement = document.getElementById("form-visibility");

    // Assert
    expect(switchElement).toBeDefined();
    expect(switchElement?.hasAttribute("disabled")).toBe(true);
  });

  it("shows dismiss-required modal with backend message when enabling fails", async () => {
    // Arrange
    const backendMessage =
      "Cannot enable single submission gate because this form already has duplicate submissions.";
    mockUpdateFormSettingsAction.mockResolvedValue({
      kind: 1,
      errorType: 1,
      message: backendMessage,
    });
    const form = {
      id: "form-1",
      name: "Form",
      isEnabled: true,
      isPublic: false,
      limitOnePerUser: false,
      folderId: null,
      createdAt: new Date(),
    };

    render(<FormDetails form={form} enableEditing />);
    const switchElement = document.getElementById("form-limit-one");

    // Act
    fireEvent.click(switchElement!);
    fireEvent.click(screen.getByText("Enable permanently"));

    // Assert
    expect(
      await screen.findByText('Could not enable "one response per person"'),
    ).toBeDefined();
    expect(await screen.findByText(backendMessage)).toBeDefined();

    fireEvent.click(screen.getByText("Dismiss"));

    await waitFor(() => {
      expect(
        screen.queryByText('Could not enable "one response per person"'),
      ).toBeNull();
    });
  });
});
