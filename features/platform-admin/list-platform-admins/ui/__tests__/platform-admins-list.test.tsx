import { act, fireEvent, screen, within } from "@testing-library/react";
import { renderWithBrand as render } from "@/test/render-with-brand";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import type { PlatformTenantsPage } from "@/lib/endatix-api/platform-tenants/platform-tenants";
import { stubPhoneWidth } from "@/test/stubs/phone-width";
import { PlatformAdminsList } from "../platform-admins-list";

const url = vi.hoisted(() => ({
  updateUrl: vi.fn(),
  setSearch: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("@/components/table", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/table")>()),
  useListUrlState: () => ({
    search: url.searchParams.get("search") ?? "",
    setSearch: url.setSearch,
    updateUrl: url.updateUrl,
    searchParams: url.searchParams,
    isPending: false,
  }),
}));
vi.mock("@/features/analytics/posthog/client", () => ({
  useTrackEvent: () => ({ trackEvent: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const NO_TENANTS: PlatformTenantsPage = {
  page: 1,
  pageSize: 10,
  totalPages: 0,
  totalRecords: 0,
  hasNextPage: false,
  items: [],
};

async function renderList(query: string) {
  url.searchParams = new URLSearchParams(query);
  await act(async () => {
    render(
      <PlatformAdminsList
        usersPromise={Promise.resolve({
          page: 1,
          pageSize: 10,
          totalPages: 0,
          totalRecords: 0,
          items: [],
        })}
        tenantsPromise={Promise.resolve(Result.success(NO_TENANTS))}
        approvedAdminTotalPromise={Promise.resolve(1)}
        listKey="platform-admins"
      />,
    );
  });
}

describe("PlatformAdminsList on a phone", () => {
  beforeEach(() => {
    stubPhoneWidth();
  });

  it("counts Approval and Tenant on Filters and labels both in the drawer", async () => {
    // Arrange
    await renderList("scope=approved&tenantId=7");

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Filters · 2" }));

    // Assert
    const drawer = screen.getByRole("dialog", { name: "Filters" });
    expect(within(drawer).getByLabelText("Approval").textContent).toContain(
      "Approved",
    );
    expect(within(drawer).getByLabelText("Tenant")).toBeTruthy();
  });

  it("clears the same state from the toolbar's Reset, the drawer's Reset and the empty state", async () => {
    // Arrange
    await renderList("search=ada&scope=candidates");

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Reset Filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Filters · 1" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Filters" })).getByRole(
        "button",
        { name: "Reset" },
      ),
    );

    // Assert
    const [toolbar, empty, drawer] = url.updateUrl.mock.calls;
    expect(empty).toEqual(toolbar);
    expect(drawer).toEqual(toolbar);
    expect(toolbar[0]).toEqual({
      search: null,
      scope: null,
      tenantId: null,
      page: "1",
    });
    expect(url.setSearch).toHaveBeenCalledTimes(3);
  });
});
