import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataListItemsPage } from "@/lib/endatix-api/data-lists/data-lists";
import { stubPhoneWidth } from "@/test/stubs/phone-width";
import { stubResizeObserver } from "@/test/stubs/resize-observer";
import { stubScrollIntoView } from "@/test/stubs/scroll-into-view";
import { DataListItemsSection } from "../ui/data-list-details-page";

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

const NO_ITEMS: DataListItemsPage = {
  page: 1,
  pageSize: 10,
  totalPages: 0,
  totalRecords: 0,
  hasNextPage: false,
  items: [],
};

async function renderSection(query: string) {
  url.searchParams = new URLSearchParams(query);
  await act(async () => {
    render(
      <DataListItemsSection
        itemsPromise={Promise.resolve(NO_ITEMS)}
        availableLocales={["de", "fr"]}
        defaultLocale="en"
      />,
    );
  });
}

describe("DataListItemsSection on a phone", () => {
  beforeEach(() => {
    stubPhoneWidth();
    stubResizeObserver();
    stubScrollIntoView();
  });

  it("counts the locale facet and lists it inline in the Filters drawer", async () => {
    // Arrange
    await renderSection("hasLocale=de");

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Filters · 1" }));

    // Assert
    const drawer = screen.getByRole("dialog", { name: "Filters" });
    const locale = within(drawer).getByRole("group", { name: "Locale" });
    expect(
      within(locale).getByRole("option", { name: /German/ }).dataset.selection,
    ).toBe("all");
  });

  it("clears the same state from the toolbar's Reset, the drawer's Reset and the empty state", async () => {
    // Arrange
    await renderSection("search=zzz&hasLocale=de");

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
    expect(toolbar[0]).toMatchObject({
      search: null,
      hasLocale: null,
      page: "1",
    });
  });
});
