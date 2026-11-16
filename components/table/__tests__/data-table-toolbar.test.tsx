import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { stubResizeObserver } from "@/test/stubs/resize-observer";
import { stubScrollIntoView } from "@/test/stubs/scroll-into-view";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTableFilter, FiltersDrawerScope } from "../data-table-filter";
import { DataTableToolbar } from "../data-table-toolbar";
import { FacetedFilter } from "../faceted-filter";

const STATUS_OPTIONS = [
  { label: "New", value: "new" },
  { label: "Read", value: "read" },
];

function stubWidth(mobile: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query.includes("max-width") ? mobile : !mobile,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function toolbar() {
  return document.querySelector<HTMLElement>(
    '[data-slot="data-table-toolbar"]',
  )!;
}

function region(slot: string) {
  return document.querySelector<HTMLElement>(
    `[data-slot="data-table-toolbar-${slot}"]`,
  )!;
}

function openMenu(name: string) {
  const trigger = screen.getByRole("button", { name });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  return screen.getByRole("menu");
}

describe("DataTableToolbar", () => {
  it("keeps search, filters, Reset and actions in one toolbar", () => {
    // Arrange & Act
    render(
      <DataTableToolbar
        search={<input aria-label="Search" />}
        filters={<button type="button">Status</button>}
        reset={{ onClick: vi.fn(), hasFilters: true }}
        actions={<button type="button">Export</button>}
      />,
    );

    // Assert
    const filters = region("filters");
    expect(
      within(filters).getByRole("textbox", { name: "Search" }),
    ).toBeTruthy();
    expect(
      within(filters).getByRole("button", { name: "Status" }),
    ).toBeTruthy();
    expect(
      within(region("actions")).getByRole("button", { name: "Export" }),
    ).toBeTruthy();
    expect(toolbar().contains(region("filters"))).toBe(true);
  });

  it("puts Reset outside the filters' own scroll, so it is never scrolled away", () => {
    // Arrange & Act
    render(
      <DataTableToolbar
        filters={<button type="button">Status</button>}
        reset={{ onClick: vi.fn(), hasFilters: true }}
      />,
    );

    // Assert
    const reset = screen.getByRole("button", { name: "Reset Filters" });
    expect(
      reset.closest('[data-slot="data-table-toolbar-reset"]'),
    ).toBeTruthy();
    expect(
      within(region("reset")).queryByRole("button", { name: "Status" }),
    ).toBeNull();
  });

  it("shows no Filters button for a list without filters", () => {
    // Arrange & Act
    render(<DataTableToolbar search={<input aria-label="Search" />} />);

    // Assert
    expect(screen.queryByRole("button", { name: /^Filters/ })).toBeNull();
  });

  it("counts the active filters on the Filters button", () => {
    // Arrange & Act
    render(
      <DataTableToolbar
        filters={<button type="button">Status</button>}
        activeFilterCount={2}
      />,
    );

    // Assert
    expect(screen.getByRole("button", { name: "Filters · 2" })).toBeTruthy();
  });
});

describe("DataTableToolbar Filters drawer", () => {
  beforeEach(() => {
    stubResizeObserver(); // cmdk measures its list
    stubScrollIntoView();
  });

  function renderWithFacets(
    onReset = vi.fn(),
    hasFilters = true,
    onReviewChange = vi.fn(),
  ) {
    stubWidth(true);
    render(
      <DataTableToolbar
        filters={
          <>
            <FacetedFilter
              title="Review"
              options={STATUS_OPTIONS}
              selectedValues={new Set(["new"])}
              onValueChange={onReviewChange}
            />
            <DataTableFilter label="Type">
              {({ id }) => (
                <select id={id}>
                  <option>All</option>
                </select>
              )}
            </DataTableFilter>
          </>
        }
        activeFilterCount={1}
        reset={{ onClick: onReset, hasFilters }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Filters · 1" }));
    return screen.getByRole("dialog");
  }

  it("moves focus into the drawer when it opens", async () => {
    // Arrange & Act
    const drawer = renderWithFacets();

    // Assert
    await waitFor(() =>
      expect(drawer.contains(document.activeElement)).toBe(true),
    );
  });

  it("has a title and a description", () => {
    // Arrange & Act
    const drawer = renderWithFacets();

    // Assert
    expect(drawer.getAttribute("aria-labelledby")).toBeTruthy();
    expect(within(drawer).getByText("Filters")).toBeTruthy();
    expect(drawer.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("lists each facet's options inline under its own label, with no popover", () => {
    // Arrange & Act
    const drawer = renderWithFacets();

    // Assert
    const review = within(drawer).getByRole("group", { name: "Review" });
    const option = within(review).getByRole("option", { name: "New" });
    expect(option.getAttribute("data-selection")).toBe("all");
    expect(within(review).getByRole("option", { name: "Read" })).toBeTruthy();
    expect(
      within(drawer).queryByRole("combobox", { name: "Review" }),
    ).toBeNull();
    expect(within(drawer).getByLabelText("Type").tagName).toBe("SELECT");
  });

  it("keeps a search box on a long inline facet only", () => {
    // Arrange
    stubWidth(true);
    const locales = Array.from({ length: 9 }, (_, i) => ({
      label: `Locale ${i}`,
      value: `l${i}`,
    }));
    render(
      <DataTableToolbar
        filters={
          <>
            <FacetedFilter
              title="Locale"
              options={locales}
              selectedValues={new Set()}
              onValueChange={vi.fn()}
            />
            <FacetedFilter
              title="Review"
              options={STATUS_OPTIONS}
              selectedValues={new Set()}
              onValueChange={vi.fn()}
            />
          </>
        }
      />,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    // Assert
    const drawer = screen.getByRole("dialog");
    const locale = within(drawer).getByRole("group", { name: "Locale" });
    const review = within(drawer).getByRole("group", { name: "Review" });
    expect(within(locale).queryByRole("combobox")).toBeTruthy();
    expect(within(review).queryByRole("combobox")).toBeNull();
  });

  it("lets a keyboard reach an inline facet and toggle its option", () => {
    // Arrange
    const onReviewChange = vi.fn();
    const drawer = renderWithFacets(vi.fn(), true, onReviewChange);
    const list = within(drawer)
      .getByRole("group", { name: "Review" })
      .querySelector<HTMLElement>("[cmdk-root]")!;

    // Act
    list.focus();
    fireEvent.keyDown(list, { key: "Enter" });

    // Assert
    expect(list.tabIndex).toBe(0);
    expect(document.activeElement).toBe(list);
    expect([...onReviewChange.mock.calls[0][0]]).toEqual([]);
  });

  it("ignores Enter on a disabled inline facet", () => {
    // Arrange
    const onReviewChange = vi.fn();
    render(
      <FiltersDrawerScope>
        <FacetedFilter
          title="Review"
          options={STATUS_OPTIONS}
          selectedValues={new Set(["new"])}
          onValueChange={onReviewChange}
          disabled
        />
      </FiltersDrawerScope>,
    );
    const list = screen
      .getByRole("group", { name: "Review" })
      .querySelector<HTMLElement>("[cmdk-root]")!;

    // Act
    list.focus();
    fireEvent.keyDown(list, { key: "Enter" });

    // Assert
    expect(onReviewChange).not.toHaveBeenCalled();
    expect(list.tabIndex).toBe(-1);
  });

  it("filters from an inline option and keeps the drawer open", () => {
    // Arrange
    const onReviewChange = vi.fn();
    const drawer = renderWithFacets(vi.fn(), true, onReviewChange);

    // Act
    fireEvent.click(within(drawer).getByRole("option", { name: "Read" }));

    // Assert
    expect([...onReviewChange.mock.calls[0][0]].sort()).toEqual([
      "new",
      "read",
    ]);
    expect(drawer.getAttribute("data-state")).toBe("open");
  });

  it("resets the same filters as the toolbar's Reset", () => {
    // Arrange
    const onReset = vi.fn();
    const drawer = renderWithFacets(onReset);

    // Act
    fireEvent.click(within(drawer).getByRole("button", { name: "Reset" }));

    // Assert
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("disables Reset while no filter is set", () => {
    // Arrange & Act
    const drawer = renderWithFacets(vi.fn(), false);

    // Assert
    expect(
      within(drawer)
        .getByRole("button", { name: "Reset" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("closes on Done", () => {
    // Arrange
    const drawer = renderWithFacets();

    // Act
    fireEvent.click(within(drawer).getByRole("button", { name: "Done" }));

    // Assert: Vaul keeps the closed drawer mounted for its exit animation
    expect(drawer.getAttribute("data-state")).toBe("closed");
  });
});

describe("DataTableToolbar More actions", () => {
  it("shows no ⋯ menu when the list has nothing to put in it", () => {
    // Arrange & Act
    render(
      <DataTableToolbar actions={<button type="button">Export</button>} />,
    );

    // Assert
    expect(screen.queryByRole("button", { name: "More actions" })).toBeNull();
  });

  it("lists occasional actions in ⋯ at every width", () => {
    // Arrange
    stubWidth(false);
    render(
      <DataTableToolbar
        moreActions={
          <DropdownMenuItem>Delete test submissions</DropdownMenuItem>
        }
      />,
    );

    // Act
    const menu = openMenu("More actions");

    // Assert
    expect(
      within(menu).getByRole("menuitem", { name: "Delete test submissions" }),
    ).toBeTruthy();
  });

  it("puts a collapsible action's menu form in ⋯ behind the md breakpoint its row form uses", () => {
    // Arrange
    render(
      <DataTableToolbar
        collapsibleActions={{
          inline: <button type="button">Columns</button>,
          menuItems: <DropdownMenuItem>Columns…</DropdownMenuItem>,
        }}
        moreActions={
          <DropdownMenuItem>Delete test submissions</DropdownMenuItem>
        }
      />,
    );

    // Act
    const menu = openMenu("More actions");

    // Assert
    const inline = within(region("actions"))
      .getByRole("button", { name: "Columns" })
      .closest(".md\\:contents");
    const collapsed = within(menu)
      .getByRole("menuitem", { name: "Columns…" })
      .closest('[data-slot="more-actions-collapsed"]');
    expect(inline?.classList.contains("hidden")).toBe(true);
    expect(collapsed?.classList.contains("md:hidden")).toBe(true);
    expect(
      within(menu)
        .getByRole("menuitem", { name: "Delete test submissions" })
        .closest('[data-slot="more-actions-collapsed"]'),
    ).toBeNull();
  });
});
