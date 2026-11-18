import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import type { PlatformTenantListItem } from "@/lib/endatix-api";
import type { NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { TenantsList } from "../tenants-list";

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
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const NO_TENANTS: NormalizedPagedResponse<PlatformTenantListItem> = {
  page: 1,
  pageSize: 10,
  totalPages: 0,
  totalRecords: 0,
  hasNextPage: false,
  items: [],
};

async function renderFilteredEmpty() {
  url.searchParams = new URLSearchParams("search=zzz&createdFrom=2026-01-01");
  await act(async () => {
    render(
      <TenantsList
        tenantsPromise={Promise.resolve(Result.success(NO_TENANTS))}
        listKey="tenants"
      />,
    );
  });
}

describe("TenantsList Reset", () => {
  beforeEach(() => {
    url.searchParams = new URLSearchParams();
  });

  it("clears the same state from the toolbar's Reset and the empty state's Clear filters", async () => {
    // Arrange
    await renderFilteredEmpty();

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Reset Filters" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Clear filters" }),
    );

    // Assert
    expect(url.updateUrl).toHaveBeenCalledTimes(2);
    expect(url.updateUrl.mock.calls[0]).toEqual(url.updateUrl.mock.calls[1]);
    expect(url.updateUrl.mock.calls[0][0]).toMatchObject({
      search: null,
      createdFrom: null,
      page: "1",
    });
    expect(url.setSearch).toHaveBeenNthCalledWith(2, "");
  });
});
