import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TenantsTable } from "../tenants-table";
import type { PagedResponse, PlatformTenantListItem } from "@/lib/endatix-api";

vi.mock("@/lib/utils/hooks/use-media-query.hook", () => ({
  useMediaQuery: () => true,
}));

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
    expect(
      screen.queryByRole("button", { name: /open tenant actions/i }),
    ).toBeNull();
  });

  it("shows row actions when management is on", () => {
    render(<TenantsTable tenants={TENANTS} canManage />);
    expect(
      screen.getByRole("button", { name: /open tenant actions/i }),
    ).toBeTruthy();
  });
});

describe("TenantsTable columns", () => {
  it("shows the public id and self-registration state", () => {
    render(<TenantsTable tenants={TENANTS} />);

    expect(screen.getByText("xk9mp2qr")).toBeTruthy();
    expect(screen.getByText("On")).toBeTruthy();
  });

  it("spans the empty row across the actions column when management is on", () => {
    render(<TenantsTable tenants={{ ...TENANTS, items: [] }} canManage />);

    expect(screen.getByText("No tenants found.").getAttribute("colspan")).toBe(
      "9",
    );
  });
});
