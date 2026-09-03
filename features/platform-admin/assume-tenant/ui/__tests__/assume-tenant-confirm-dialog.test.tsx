import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Result } from "@/lib/result";
import { assumeTenantAction } from "../../assume-tenant.action";
import { AssumeTenantConfirmDialog } from "../assume-tenant-confirm-dialog";

vi.mock("../../assume-tenant.action", () => ({
  assumeTenantAction: vi.fn(),
}));

const toastError = vi.fn();
vi.mock("@/components/ui/toast", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

const assumeTenantActionMock = vi.mocked(assumeTenantAction);

describe("AssumeTenantConfirmDialog", () => {
  it("does not assume until the operator confirms", () => {
    render(
      <AssumeTenantConfirmDialog
        tenant={{ id: "42", name: "Acme" }}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Assume tenant for support?")).toBeTruthy();
    expect(assumeTenantActionMock).not.toHaveBeenCalled();
  });

  it("calls assume after confirmation", async () => {
    render(
      <AssumeTenantConfirmDialog
        tenant={{ id: "42", name: "Acme" }}
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /assume tenant/i }));
    await waitFor(() => {
      expect(assumeTenantActionMock).toHaveBeenCalledWith("42");
    });
  });

  it("shows a toast when the assume call fails", async () => {
    assumeTenantActionMock.mockResolvedValueOnce(
      Result.error("Failed to enter tenant") as never,
    );

    render(
      <AssumeTenantConfirmDialog
        tenant={{ id: "42", name: "Acme" }}
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /assume tenant/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Failed to enter tenant"),
    );
  });
});
