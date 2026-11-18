import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlatformTenantListItem } from "@/lib/endatix-api";
import { normalizePagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { TenantsTable } from "../ui/tenants-table";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/tenants",
  useSearchParams: () => new URLSearchParams(),
}));

function tenants(count: number): PlatformTenantListItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${index + 1}`,
    name: `Tenant ${index + 1}`,
    shortUrl: `tenant-${index + 1}`,
    createdAt: "2026-10-01T10:00:00Z",
    formsCount: 0,
    submissionsCount: 0,
    selfRegistrationEnabled: false,
  }));
}

describe("TenantsTable", () => {
  it("shows every tenant of a 50-tenant server page", () => {
    // Arrange
    const page = normalizePagedResponse({
      items: tenants(50),
      page: 1,
      pageSize: 50,
      totalRecords: 120,
      totalPages: 3,
    });

    // Act
    render(
      <TenantsTable
        tenants={page}
        updateUrl={vi.fn()}
        urlState={{ page: 1, pageSize: 50 }}
        isPending={false}
      />,
    );

    // Assert
    expect(screen.getAllByText(/^Tenant \d+$/)).toHaveLength(50);
  });
});
