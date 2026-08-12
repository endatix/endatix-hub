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
  const onPendingChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("highlights the locale and keeps Remove disabled when locale is null", () => {
    render(
      <RemoveLocaleConfirmDialog
        open
        onOpenChange={onOpenChange}
        dataListId="42"
        locale={null}
        onRemoved={onRemoved}
      />,
    );

    expect(
      (screen.getByRole("button", { name: "Remove" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.queryByText(/· Test/)).toBeNull();
  });

  it("shows the locale subtitle and catalog warning copy", () => {
    render(
      <RemoveLocaleConfirmDialog
        open
        onOpenChange={onOpenChange}
        dataListId="42"
        locale="fr"
        onRemoved={onRemoved}
      />,
    );

    expect(screen.getByText("fr · Test")).not.toBeNull();
    expect(
      screen.getByText(
        /This removes the language from the data catalog and deletes each label translation from every item/,
      ),
    ).not.toBeNull();
  });

  it("keeps the dialog open until remove succeeds, then closes", async () => {
    const details = {
      id: "42",
      name: "Countries",
      isActive: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      itemsCount: 1,
      availableLocales: [],
      items: [],
    };
    let resolveRemove: ((value: Result<typeof details>) => void) | undefined;
    vi.mocked(removeLocaleAction).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRemove = resolve;
        }),
    );

    render(
      <RemoveLocaleConfirmDialog
        open
        onOpenChange={onOpenChange}
        dataListId="42"
        locale="fr"
        onRemoved={onRemoved}
        onPendingChange={onPendingChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(onPendingChange).toHaveBeenCalledWith(true);
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    resolveRemove?.(Result.success(details));

    await waitFor(() => {
      expect(removeLocaleAction).toHaveBeenCalledWith("42", "fr");
      expect(onRemoved).toHaveBeenCalledWith(details);
      expect(toast.success).toHaveBeenCalledWith("Removed locale fr");
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onPendingChange).toHaveBeenCalledWith(false);
    });
  });

  it("shows an error toast and keeps the dialog open when remove fails", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Locale is still in use");
    });
    expect(onRemoved).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
