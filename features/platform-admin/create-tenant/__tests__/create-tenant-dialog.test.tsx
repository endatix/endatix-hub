import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Result } from "@/lib/result";
import { createTenantAction } from "../create-tenant.action";
import { CreateTenantDialog } from "../ui/create-tenant-dialog";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));

vi.mock("../create-tenant.action", () => ({
  createTenantAction: vi.fn(),
}));

const createTenantActionMock = vi.mocked(createTenantAction);

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("CreateTenantDialog", () => {
  it("blocks continue when the name is empty", async () => {
    render(<CreateTenantDialog />);
    fireEvent.click(screen.getByRole("button", { name: /create tenant/i }));

    fireEvent.click(await screen.findByRole("button", { name: /continue/i }));

    expect(await screen.findByText("Name is required.")).toBeTruthy();
  });

  it("does not show a slug field on the identity step", async () => {
    render(<CreateTenantDialog />);
    fireEvent.click(screen.getByRole("button", { name: /create tenant/i }));

    expect(await screen.findByLabelText("Name")).toBeTruthy();
    expect(screen.queryByLabelText("Slug")).toBeNull();
    expect(
      screen.getByText(/unique short URL is generated during creation/i),
    ).toBeTruthy();
    expect(screen.queryByText("Allowed auth providers")).toBeNull();
  });

  it("does not show auth providers on the access step", async () => {
    render(<CreateTenantDialog />);
    fireEvent.click(screen.getByRole("button", { name: /create tenant/i }));
    fireEvent.change(await screen.findByLabelText("Name"), {
      target: { value: "Acme Surveys" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(
      await screen.findByLabelText("Allow self-registration"),
    ).toBeTruthy();
    expect(screen.queryByText("Allowed auth providers")).toBeNull();
  });

  it("shows a Hub access warning for Creator", async () => {
    render(<CreateTenantDialog />);
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
        shortUrl: "xk9mp2qr",
        allowSelfRegistration: false,
        allowedAuthProviderKeys: [],
        defaultRegistrationRoleName: "Respondent",
        createdAt: "2026-01-15T00:00:00.000Z",
      }),
    );

    render(<CreateTenantDialog />);
    fireEvent.click(screen.getByRole("button", { name: /create tenant/i }));
    fireEvent.change(await screen.findByLabelText("Name"), {
      target: { value: "Acme Surveys" },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(await screen.findByRole("button", { name: /continue/i }));
    const createButtons = screen.getAllByRole("button", {
      name: /^create tenant$/i,
    });
    fireEvent.click(createButtons[createButtons.length - 1]);

    const urlInput = (await screen.findByLabelText(
      "Public sign-in URL",
    )) as HTMLInputElement;
    expect(urlInput.value).toBe("/t/xk9mp2qr/signin");
    await waitFor(() => {
      expect(createTenantActionMock).toHaveBeenCalledOnce();
    });
    expect(createTenantActionMock.mock.calls[0][0]).not.toHaveProperty(
      "shortUrl",
    );
  });
});
