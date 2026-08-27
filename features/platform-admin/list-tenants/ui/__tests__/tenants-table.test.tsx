import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { mockMatchMedia } from "@/__tests__/utils/mock-match-media";
import { TenantsTable } from "../tenants-table";
import type { PlatformTenantListItem } from "@/lib/endatix-api";
import type { NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/tenants",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/platform-admin/update-tenant/update-tenant.action", () => ({
  getTenantAction: vi.fn(),
  updateTenantAction: vi.fn(),
}));

vi.mock("@/features/platform-admin/assume-tenant/assume-tenant.action", () => ({
  assumeTenantAction: vi.fn(),
}));

beforeAll(() => {
  mockMatchMedia(true);
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

describe("TenantsTable", () => {
  it("hides row actions when management is off", () => {
    render(<TenantsTable tenants={TENANTS} />);
    expect(screen.getByText("Acme")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /open tenant actions/i })).toBeNull();
  });

  it("shows row actions when management is on", () => {
    render(<TenantsTable tenants={TENANTS} canManage />);
    expect(screen.getByRole("button", { name: /open tenant actions/i })).toBeTruthy();
  });

  it("shows public id instead of numeric id and usage counts", () => {
    render(<TenantsTable tenants={TENANTS} />);
    expect(screen.getByText("Public id")).toBeTruthy();
    expect(screen.queryByText("ID")).toBeNull();
    expect(screen.queryByText("Forms")).toBeNull();
    expect(screen.queryByText("Submissions")).toBeNull();
  });

  it("does not assume a tenant just by rendering row actions", () => {
    render(<TenantsTable tenants={TENANTS} canManage />);
    expect(screen.queryByText("Assume tenant for support?")).toBeNull();
  });

  it("shows an empty state when there are no tenants", () => {
    render(
      <TenantsTable
        tenants={{
          ...TENANTS,
          items: [],
          totalRecords: 0,
          totalPages: 0,
        }}
      />,
    );

    expect(screen.getByText("No tenants found.")).toBeTruthy();
  });
});
