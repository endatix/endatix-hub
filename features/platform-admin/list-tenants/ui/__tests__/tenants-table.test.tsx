import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TenantsTable } from "../tenants-table";
import type { PagedResponse, PlatformTenantListItem } from "@/lib/endatix-api";

vi.mock("@/features/platform-admin/update-tenant/update-tenant.action", () => ({
  getTenantAction: vi.fn(),
  updateTenantAction: vi.fn(),
}));

const TENANTS: PagedResponse<PlatformTenantListItem> = {
  page: 1,
  pageSize: 10,
  totalPages: 1,
  totalRecords: 1,
  items: [
    {
      id: "42",
      name: "Acme",
      slug: "xK9mP2qR8vNw",
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
    expect(screen.queryByRole("button", { name: /open tenant actions/i })).toBeNull();
  });

  it("shows row actions when management is on", () => {
    render(<TenantsTable tenants={TENANTS} canManage />);
    expect(screen.getByRole("button", { name: /open tenant actions/i })).toBeTruthy();
  });
});
