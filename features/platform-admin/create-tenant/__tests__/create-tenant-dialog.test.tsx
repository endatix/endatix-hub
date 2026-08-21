import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CreateTenantDialog } from "../ui/create-tenant-dialog";

vi.mock("../create-tenant.action", () => ({
  createTenantAction: vi.fn(),
}));

describe("CreateTenantDialog", () => {
  it("blocks continue when the name is empty", async () => {
    render(<CreateTenantDialog authProviders={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /create tenant/i }));

    fireEvent.click(await screen.findByRole("button", { name: /continue/i }));

    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
  });

  it("shows a Hub access warning for Creator", async () => {
    render(<CreateTenantDialog authProviders={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /create tenant/i }));

    fireEvent.change(await screen.findByLabelText("Name"), {
      target: { value: "Acme Surveys" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.click(await screen.findByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: "Creator" }));

    expect(await screen.findByText("Hub access")).toBeInTheDocument();
  });
});
