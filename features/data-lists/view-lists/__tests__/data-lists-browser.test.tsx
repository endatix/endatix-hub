import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataListsPage } from "@/lib/endatix-api/data-lists/data-lists";
import { DataListsBrowser } from "../ui/data-lists-browser";

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
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

const NO_LISTS: DataListsPage = {
  page: 1,
  pageSize: 10,
  totalPages: 0,
  totalRecords: 0,
  hasNextPage: false,
  items: [],
};

describe("DataListsBrowser Reset", () => {
  beforeEach(() => {
    url.searchParams = new URLSearchParams("search=zzz&createdFrom=2026-01-01");
  });

  it("clears the same state from the toolbar's Reset and the empty state's Clear filters", async () => {
    // Arrange
    await act(async () => {
      render(
        <DataListsBrowser
          dataListsPromise={Promise.resolve(NO_LISTS)}
          listKey="data-lists"
        />,
      );
    });

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Reset Filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    // Assert
    const [toolbar, empty] = url.updateUrl.mock.calls;
    expect(empty).toEqual(toolbar);
    expect(toolbar[0]).toMatchObject({
      search: null,
      hasLocale: null,
      createdFrom: null,
      page: "1",
    });
  });
});
