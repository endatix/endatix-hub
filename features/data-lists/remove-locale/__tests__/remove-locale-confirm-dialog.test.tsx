import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Result } from "@/lib/result";
import { toast } from "@/components/ui/toast";
import { RemoveLocaleConfirmDialog } from "../ui/remove-locale-confirm-dialog";
import { removeLocaleAction } from "../remove-locale.action";

vi.mock("../remove-locale.action", () => ({
  removeLocaleAction: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/features/data-lists/translations/locale-discovery", () => ({
  formatLocaleLabel: (locale: string) => `${locale} · Test`,
}));

describe("RemoveLocaleConfirmDialog", () => {
  const onOpenChange = vi.fn();
  const onRemoved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("highlights the locale and keeps Remove disabled when locale is null", () => {
    // Arrange / Act
    render(
      <RemoveLocaleConfirmDialog
        open
        onOpenChange={onOpenChange}
        dataListId="42"
        locale={null}
        onRemoved={onRemoved}
      />,
    );

    // Assert
    expect(
      (screen.getByRole("button", { name: "Remove" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.queryByText(/· Test/)).toBeNull();
  });

  it("shows the locale subtitle when a locale is selected", () => {
    // Arrange / Act
    render(
      <RemoveLocaleConfirmDialog
        open
        onOpenChange={onOpenChange}
        dataListId="42"
        locale="fr"
        onRemoved={onRemoved}
      />,
    );

    // Assert
    expect(screen.getByText("fr · Test")).not.toBeNull();
    expect(
      screen.getByText(/deletes its labels from every item/i),
    ).not.toBeNull();
  });

  it("calls removeLocaleAction and notifies parent on confirm", async () => {
    // Arrange
    const details = {
      id: "42",
      name: "Countries",
      isActive: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      itemsCount: 1,
      availableLocales: [],
      items: [],
    };
    vi.mocked(removeLocaleAction).mockResolvedValue(Result.success(details));

    render(
      <RemoveLocaleConfirmDialog
        open
        onOpenChange={onOpenChange}
        dataListId="42"
        locale="fr"
        onRemoved={onRemoved}
      />,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    // Assert
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => {
      expect(removeLocaleAction).toHaveBeenCalledWith("42", "fr");
      expect(onRemoved).toHaveBeenCalledWith(details);
      expect(toast.success).toHaveBeenCalledWith("Removed locale fr");
    });
  });

  it("shows an error toast when removeLocaleAction fails", async () => {
    // Arrange
    vi.mocked(removeLocaleAction).mockResolvedValue(
      Result.error("Locale is still in use"),
    );

    render(
      <RemoveLocaleConfirmDialog
        open
        onOpenChange={onOpenChange}
        dataListId="42"
        locale="fr"
        onRemoved={onRemoved}
      />,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    // Assert
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Locale is still in use");
    });
    expect(onRemoved).not.toHaveBeenCalled();
  });
});
