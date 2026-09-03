import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Result } from "@/lib/result";
import {
  getTenantAction,
  updateTenantAction,
} from "@/features/platform-admin/update-tenant/update-tenant.action";
import { EditTenantSheet } from "../edit-tenant-sheet";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));

vi.mock("@/features/platform-admin/update-tenant/update-tenant.action", () => ({
  getTenantAction: vi.fn(),
  updateTenantAction: vi.fn(),
}));

const getTenantActionMock = vi.mocked(getTenantAction);
const updateTenantActionMock = vi.mocked(updateTenantAction);

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EditTenantSheet", () => {
  it("loads the tenant and saves name changes", async () => {
    getTenantActionMock.mockResolvedValue(
      Result.success({
        id: "42",
        name: "Acme",
        shortUrl: "xk9mp2qr",
        allowSelfRegistration: false,
        allowedAuthProviderKeys: [],
        defaultRegistrationRoleName: "Respondent",
        createdAt: "2026-01-15T00:00:00.000Z",
      }),
    );
    updateTenantActionMock.mockResolvedValue(
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

    const onOpenChange = vi.fn();
    render(
      <EditTenantSheet
        tenantId="42"
        authProviders={[]}
        onOpenChange={onOpenChange}
      />,
    );

    const nameInput = (await screen.findByLabelText(
      "Name",
    )) as HTMLInputElement;
    expect(nameInput.value).toBe("Acme");
    expect(
      (screen.getByLabelText("Public sign-in URL") as HTMLInputElement).value,
    ).toBe("/t/xk9mp2qr/signin");

    fireEvent.change(nameInput, { target: { value: "Acme Surveys" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(updateTenantActionMock).toHaveBeenCalledWith(
        "42",
        expect.objectContaining({ name: "Acme Surveys" }),
      );
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("EditTenantSheet failures", () => {
  it("shows the load error instead of the form", async () => {
    getTenantActionMock.mockResolvedValue(Result.error("Tenant not found"));

    render(
      <EditTenantSheet
        tenantId="42"
        authProviders={[]}
        onOpenChange={vi.fn()}
      />,
    );

    expect(await screen.findByText("Tenant not found")).toBeTruthy();
    expect(screen.queryByLabelText("Name")).toBeNull();
  });

  it("blocks a blank name before calling the API", async () => {
    getTenantActionMock.mockResolvedValue(
      Result.success({
        id: "42",
        name: "Acme",
        shortUrl: "xk9mp2qr",
        allowSelfRegistration: false,
        allowedAuthProviderKeys: [],
        defaultRegistrationRoleName: "Respondent",
        createdAt: "2026-01-15T00:00:00.000Z",
      }),
    );

    render(
      <EditTenantSheet
        tenantId="42"
        authProviders={[]}
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.change(await screen.findByLabelText("Name"), {
      target: { value: "  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText("Name is required.")).toBeTruthy();
    expect(updateTenantActionMock).not.toHaveBeenCalled();
  });
});
