import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Result } from "@/lib/result";
import { createTenantAction } from "../create-tenant.action";
import { CreateTenantDialog } from "../ui/create-tenant-dialog";

vi.mock("../create-tenant.action", () => ({
  createTenantAction: vi.fn(),
}));

const createTenantActionMock = vi.mocked(createTenantAction);

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("CreateTenantDialog", () => {
  it("blocks continue when the name is empty", async () => {
    render(<CreateTenantDialog authProviders={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /create tenant/i }));

    fireEvent.click(await screen.findByRole("button", { name: /continue/i }));

    expect(await screen.findByText("Name is required.")).toBeTruthy();
  });

  it("does not show a slug field on the identity step", async () => {
    render(<CreateTenantDialog authProviders={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /create tenant/i }));

    expect(await screen.findByLabelText("Name")).toBeTruthy();
    expect(screen.queryByLabelText("Slug")).toBeNull();
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

    expect(await screen.findByText("Hub access")).toBeTruthy();
  });

  it("shows a copyable sign-in path after create", async () => {
    createTenantActionMock.mockResolvedValue(
      Result.success({
        id: "42",
        name: "Acme Surveys",
        slug: "xK9mP2qR8vNw",
        allowSelfRegistration: false,
        allowedAuthProviderKeys: [],
        defaultRegistrationRoleName: "Respondent",
        createdAt: "2026-01-15T00:00:00.000Z",
      }),
    );

    render(<CreateTenantDialog authProviders={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /create tenant/i }));
    fireEvent.change(await screen.findByLabelText("Name"), {
      target: { value: "Acme Surveys" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(await screen.findByRole("button", { name: /continue/i }));
    const createButtons = screen.getAllByRole("button", { name: /^create tenant$/i });
    fireEvent.click(createButtons[createButtons.length - 1]);

    const urlInput = (await screen.findByLabelText("Public sign-in URL")) as HTMLInputElement;
    expect(urlInput.value).toBe("/t/xK9mP2qR8vNw/signin");
    await waitFor(() => {
      expect(createTenantActionMock).toHaveBeenCalledOnce();
    });
    expect(createTenantActionMock.mock.calls[0][0]).not.toHaveProperty("slug");
  });
});
