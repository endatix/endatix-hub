import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FormsListToolbar } from "../ui/forms-list-toolbar";

const updateUrl = vi.fn();
const setSearch = vi.fn();

vi.mock("@/components/table", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/table")>();
  return {
    ...actual,
    useListUrlState: () => ({
      search: "survey",
      setSearch,
      urlSearch: "survey",
      updateUrl,
      searchParams: new URLSearchParams(
        "search=survey&status=enabled&visibility=public&browse=all&page=3",
      ),
    }),
  };
});

describe("FormsListToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears search, status, visibility, browse, and resets page when Clear filters is clicked", () => {
    // Arrange
    render(<FormsListToolbar variant="root" />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    // Assert
    expect(updateUrl).toHaveBeenCalledWith({
      search: null,
      status: null,
      visibility: null,
      browse: null,
      page: "1",
    });
  });

  it("clears browse along with other filters on folder pages", () => {
    // Arrange
    render(<FormsListToolbar variant="folder" />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    // Assert
    expect(updateUrl).toHaveBeenCalledWith({
      search: null,
      status: null,
      visibility: null,
      browse: null,
      page: "1",
    });
  });
});
