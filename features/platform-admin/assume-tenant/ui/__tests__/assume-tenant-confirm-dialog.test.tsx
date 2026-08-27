import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { assumeTenantAction } from "../../assume-tenant.action";
import { AssumeTenantConfirmDialog } from "../assume-tenant-confirm-dialog";

vi.mock("../../assume-tenant.action", () => ({
  assumeTenantAction: vi.fn(),
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

  it("calls assume after confirmation", () => {
    render(
      <AssumeTenantConfirmDialog
        tenant={{ id: "42", name: "Acme" }}
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /assume tenant/i }));
    expect(assumeTenantActionMock).toHaveBeenCalledWith("42");
  });
});
