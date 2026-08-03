import { mockMatchMedia } from "@/__tests__/utils/mock-match-media";
import {
  ColumnHeader,
  DateFilterControls,
  getColumnHeaderChromeClassName,
  getColumnHeaderTitleSwapClassName,
} from "@/features/submissions/ui/table/column-header";
import { ColumnVisibilityProvider } from "@/features/submissions/ui/table/column-visibility-context";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("DateFilterControls", () => {
  it("keeps date edits local until Apply is clicked", () => {
    const onChange = vi.fn();

    render(
      <DateFilterControls idPrefix="createdAt" value={{}} onApply={onChange} />,
    );

    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-02-03" },
    });

    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /apply/i }));

    expect(onChange).toHaveBeenCalledWith({ from: "2026-02-03" });
  });
});

describe("getColumnHeaderChromeClassName", () => {
  it("keeps chrome always visible when forceVisible is true", () => {
    // Arrange & Act
    const className = getColumnHeaderChromeClassName(true);

    // Assert
    expect(className).toBe("opacity-100");
  });

  it("hides chrome on md+ until hover or focus when inactive", () => {
    // Arrange & Act
    const className = getColumnHeaderChromeClassName(false);

    // Assert
    expect(className).toContain("md:opacity-0");
    expect(className).toContain("md:pointer-events-none");
    expect(className).toContain("md:group-hover:opacity-100");
    expect(className).toContain("md:group-hover:pointer-events-auto");
    expect(className).toContain("md:focus-within:opacity-100");
    expect(className).toContain("opacity-100");
  });
});

describe("getColumnHeaderTitleSwapClassName", () => {
  it("hides the title when chrome is forced visible", () => {
    expect(getColumnHeaderTitleSwapClassName(true)).toBe(
      "opacity-0 pointer-events-none",
    );
  });

  it("shows the title on md+ only until hover or focus", () => {
    const className = getColumnHeaderTitleSwapClassName(false);

    expect(className).toContain("opacity-0");
    expect(className).toContain("md:opacity-100");
    expect(className).toContain("md:group-hover:opacity-0");
    expect(className).toContain("md:focus-within:opacity-0");
  });
});

describe("ColumnHeader", () => {
  beforeEach(() => {
    mockMatchMedia(false);
    localStorage.clear();
  });

  function renderColumnHeader({
    isSorted = false,
  }: {
    isSorted?: false | "asc" | "desc";
  } = {}) {
    const column = {
      id: "createdAt",
      getCanSort: () => true,
      getIsSorted: () => isSorted,
      toggleSorting: vi.fn(),
      clearSorting: vi.fn(),
    };

    render(
      <ColumnVisibilityProvider
        formId="form-1"
        defaultColumns={[{ id: "createdAt" }]}
      >
        <ColumnHeader
          column={column as any}
          title="Created at"
          isSorted={isSorted}
        />
      </ColumnVisibilityProvider>,
    );

    return column;
  }

  it("cycles an unsorted header to ascending sort", () => {
    const column = renderColumnHeader();

    fireEvent.click(screen.getByRole("button", { name: /^created at$/i }));

    expect(column.toggleSorting).toHaveBeenCalledWith(false);
    expect(column.clearSorting).not.toHaveBeenCalled();
  });

  it("cycles an ascending header to descending sort", () => {
    const column = renderColumnHeader({ isSorted: "asc" });

    fireEvent.click(screen.getByRole("button", { name: /^created at$/i }));

    expect(column.toggleSorting).toHaveBeenCalledWith(true);
    expect(column.clearSorting).not.toHaveBeenCalled();
  });

  it("cycles a descending header to no sort", () => {
    const column = renderColumnHeader({ isSorted: "desc" });

    fireEvent.click(screen.getByRole("button", { name: /^created at$/i }));

    expect(column.clearSorting).toHaveBeenCalled();
    expect(column.toggleSorting).not.toHaveBeenCalled();
  });

  it("uses a column menu button separate from the sort surface when filtering is available", () => {
    const column = {
      id: "createdAt",
      getCanSort: () => true,
      getIsSorted: () => false as const,
      toggleSorting: vi.fn(),
      clearSorting: vi.fn(),
    };

    render(
      <ColumnVisibilityProvider
        formId="form-1"
        defaultColumns={[{ id: "createdAt" }]}
      >
        <ColumnHeader
          column={column as any}
          title="Created at"
          dateFilter={{ value: {}, onChange: vi.fn() }}
        />
      </ColumnVisibilityProvider>,
    );

    expect(
      screen.getByRole("button", { name: /^created at$/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /created at column menu/i }),
    ).toBeDefined();
  });

  it("omits the filter menu for sort-only columns", () => {
    renderColumnHeader();

    expect(
      screen.getByRole("button", { name: /^created at$/i }),
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: /created at column menu/i }),
    ).toBeNull();
  });

  it("forces sort chrome visible when sorted", () => {
    // Arrange & Act
    const { container } = render(
      <ColumnVisibilityProvider
        formId="form-1"
        defaultColumns={[{ id: "createdAt" }]}
      >
        <ColumnHeader
          column={
            {
              id: "createdAt",
              getCanSort: () => true,
              getIsSorted: () => "asc" as const,
              toggleSorting: vi.fn(),
              clearSorting: vi.fn(),
            } as any
          }
          title="Created at"
          isSorted="asc"
        />
      </ColumnVisibilityProvider>,
    );

    const sortChrome = container.querySelector('[aria-hidden="true"]');

    // Assert
    expect(sortChrome?.className).toContain("opacity-100");
    expect(sortChrome?.className).not.toContain("md:opacity-0");
  });

  it("crossfades centered title with overlay chrome instead of stacking", () => {
    const column = {
      id: "complete",
      getCanSort: () => true,
      getIsSorted: () => false as const,
      toggleSorting: vi.fn(),
      clearSorting: vi.fn(),
    };

    const { container } = render(
      <ColumnVisibilityProvider
        formId="form-1"
        defaultColumns={[{ id: "complete" }]}
      >
        <ColumnHeader
          column={column as any}
          title="Complete"
          align="center"
          titleContent={<span data-testid="complete-title">✓</span>}
        />
      </ColumnVisibilityProvider>,
    );

    const root = container.firstElementChild;
    expect(root?.className).toContain("relative");
    expect(root?.className).toContain("justify-center");
    const title = screen.getByTestId("complete-title");
    expect(title).toBeDefined();
    expect(title.parentElement?.className).toContain(
      "md:group-hover:opacity-0",
    );
    expect(
      screen.getByRole("button", { name: /^sort complete$/i }),
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: /complete column menu/i }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /^complete$/i })).toBeNull();
  });
});
