import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataListsListToolbar } from "../ui/data-lists-list-toolbar";

const updateUrl = vi.fn();
const setSearch = vi.fn();
let mockSearchParams = new URLSearchParams();
let mockSearch = "";

vi.mock("@/lib/list-page/use-list-url-state", () => ({
  useListUrlState: () => ({
    search: mockSearch,
    setSearch,
    urlSearch: mockSearch,
    updateUrl,
    searchParams: mockSearchParams,
  }),
}));

describe("DataListsListToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockSearch = "";
  });

  it("shows Reset Filters when a filter is active and clears search, locale, and date bounds on click", () => {
    mockSearchParams = new URLSearchParams(
      "search=widgets&hasLocale=en&createdFrom=2024-01-01&page=2",
    );
    mockSearch = "widgets";

    render(<DataListsListToolbar locales={["en", "es"]} />);

    fireEvent.click(screen.getByRole("button", { name: /reset filters/i }));

    expect(setSearch).toHaveBeenCalledWith("");
    expect(updateUrl).toHaveBeenCalledWith({
      search: null,
      hasLocale: null,
      createdFrom: null,
      createdTo: null,
      modifiedFrom: null,
      modifiedTo: null,
      page: "1",
    });
  });

  it("hides Reset Filters when no filters are active", () => {
    render(<DataListsListToolbar locales={["en", "es"]} />);

    expect(screen.queryByRole("button", { name: /reset filters/i })).toBeNull();
  });
});
