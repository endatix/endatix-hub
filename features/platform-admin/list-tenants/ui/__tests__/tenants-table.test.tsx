import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { mockMatchMedia } from "@/__tests__/utils/mock-match-media";
import { Result } from "@/lib/result";
import { getTenantAction } from "@/features/platform-admin/update-tenant/update-tenant.action";
import { TenantsTable } from "../tenants-table";
import type { PlatformTenantListItem } from "@/lib/endatix-api";
import type { NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";
import type { TenantsListUrlState } from "../../utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/tenants",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));

vi.mock("@/features/platform-admin/update-tenant/update-tenant.action", () => ({
  getTenantAction: vi.fn(),
  updateTenantAction: vi.fn(),
}));

vi.mock("@/features/platform-admin/assume-tenant/assume-tenant.action", () => ({
  assumeTenantAction: vi.fn(),
}));

const getTenantActionMock = vi.mocked(getTenantAction);

beforeAll(() => {
  mockMatchMedia(true);
  Element.prototype.scrollIntoView = vi.fn();
});

const TENANTS: NormalizedPagedResponse<PlatformTenantListItem> = {
  page: 1,
  pageSize: 10,
  totalPages: 1,
  totalRecords: 1,
  hasNextPage: false,
  items: [
    {
      id: "42",
      name: "Acme",
      shortUrl: "xk9mp2qr",
      description: "Primary tenant",
      createdAt: "2026-01-15T00:00:00.000Z",
      modifiedAt: null,
      formsCount: 3,
      submissionsCount: 12,
      selfRegistrationEnabled: true,
    },
  ],
};

const EMPTY_URL_STATE: TenantsListUrlState = {
  page: 1,
  pageSize: 10,
};

const updateUrl = vi.fn();

function renderTable(
  tenants: NormalizedPagedResponse<PlatformTenantListItem>,
  canManage = false,
) {
  return render(
    <TenantsTable
      tenants={tenants}
      updateUrl={updateUrl}
      urlState={EMPTY_URL_STATE}
      isPending={false}
      canManage={canManage}
    />,
  );
}

describe("TenantsTable", () => {
  it("hides row actions when management is off", () => {
    renderTable(TENANTS);
    expect(screen.getByText("Acme")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /open tenant actions/i }),
    ).toBeNull();
  });

  it("shows row actions when management is on", () => {
    renderTable(TENANTS, true);
    expect(
      screen.getByRole("button", { name: /open tenant actions/i }),
    ).toBeTruthy();
  });

  it("opens the edit sheet from the tenant name", async () => {
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

    renderTable(TENANTS, true);
    fireEvent.click(screen.getByRole("button", { name: /Acme/i }));

    expect(await screen.findByText("Edit tenant")).toBeTruthy();
    await waitFor(() => {
      expect(getTenantActionMock).toHaveBeenCalledWith("42");
    });
  });

  it("does not make the tenant name a button when management is off", () => {
    renderTable(TENANTS);
    expect(screen.queryByRole("button", { name: /Acme/i })).toBeNull();
  });

  it("shows public id instead of numeric id and usage counts", () => {
    renderTable(TENANTS);
    expect(screen.getByText("Public id")).toBeTruthy();
    expect(screen.queryByText("ID")).toBeNull();
    expect(screen.queryByText("Forms")).toBeNull();
    expect(screen.queryByText("Submissions")).toBeNull();
  });

  it("does not assume a tenant just by rendering row actions", () => {
    renderTable(TENANTS, true);
    expect(screen.queryByText("Assume tenant for support?")).toBeNull();
  });

  it("shows an empty state when there are no tenants", () => {
    renderTable({
      ...TENANTS,
      items: [],
      totalRecords: 0,
      totalPages: 0,
    });

    expect(screen.getByText("No tenants found.")).toBeTruthy();
  });

  it("replaces rows when the page payload changes", () => {
    const { rerender } = renderTable(TENANTS);
    expect(screen.getByText("Acme")).toBeTruthy();

    rerender(
      <TenantsTable
        tenants={{
          ...TENANTS,
          totalRecords: 1,
          items: [
            {
              ...TENANTS.items[0],
              id: "99",
              name: "Birch",
              shortUrl: "ab12cd34",
            },
          ],
        }}
        updateUrl={updateUrl}
        urlState={EMPTY_URL_STATE}
        isPending={false}
      />,
    );

    expect(screen.queryByText("Acme")).toBeNull();
    expect(screen.getByText("Birch")).toBeTruthy();
  });
});
