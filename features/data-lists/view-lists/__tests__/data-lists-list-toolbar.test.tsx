import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DataListsListToolbar,
  DataListsLocaleFacet,
} from "../ui/data-lists-list-toolbar";

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" role="menuitem" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

const updateUrl = vi.fn();
const setSearch = vi.fn();
let mockSearchParams = new URLSearchParams();
let mockSearch = "";

vi.mock("@/components/table", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/table")>();
  return {
    ...actual,
    useListUrlState: () => ({
      search: mockSearch,
      setSearch,
      urlSearch: mockSearch,
      updateUrl,
      searchParams: mockSearchParams,
    }),
  };
});

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

    render(<DataListsListToolbar />);

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

  it("shows a combined Reset menu when filters and sorting are both active", () => {
    mockSearchParams = new URLSearchParams("search=widgets&sortBy=name");
    mockSearch = "widgets";

    render(<DataListsListToolbar />);

    fireEvent.click(screen.getByRole("menuitem", { name: "Reset All" }));

    expect(setSearch).toHaveBeenCalledWith("");
    expect(updateUrl).toHaveBeenCalledWith({
      search: null,
      hasLocale: null,
      createdFrom: null,
      createdTo: null,
      modifiedFrom: null,
      modifiedTo: null,
      sortBy: null,
      sortDir: null,
      page: "1",
    });
  });

  it("hides Reset when no filters or sorting are active", () => {
    render(<DataListsListToolbar />);

    expect(screen.queryByRole("button", { name: /reset/i })).toBeNull();
  });

  it("shows Reset Sorting when only sort query params are set", () => {
    mockSearchParams = new URLSearchParams("sortBy=name&sortDir=asc");

    render(<DataListsListToolbar />);

    fireEvent.click(screen.getByRole("button", { name: /reset sorting/i }));

    expect(updateUrl).toHaveBeenCalledWith({
      sortBy: null,
      sortDir: null,
      page: "1",
    });
  });
});

describe("DataListsLocaleFacet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("renders a Locale filter when locales are present", () => {
    render(<DataListsLocaleFacet locales={["en", "es"]} />);

    expect(screen.getByRole("button", { name: /locale/i })).toBeTruthy();
  });

  it("renders nothing when the catalog is empty", () => {
    const { container } = render(<DataListsLocaleFacet locales={[]} />);

    expect(container.firstChild).toBeNull();
  });
});
