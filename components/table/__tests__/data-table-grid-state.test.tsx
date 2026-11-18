import { fireEvent, render, screen, within } from "@testing-library/react";
import { useTable } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import { hubTableFeatures, type ColumnDef } from "../hub-table-features";
import { DataTableGrid } from "../data-table-grid";

// The grid is compiled by the React Compiler in tests (vitest.config.mts), as in
// the app: each case changes table state the way a column menu or the pager does
// and expects the grid to show it at once.

type Person = { id: string; name: string; city: string };

/** How often each row's name cell rendered. */
const nameRenders = new Map<string, number>();

function NameCell({ person }: Readonly<{ person: Person }>) {
  nameRenders.set(person.id, (nameRenders.get(person.id) ?? 0) + 1);
  return person.name;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada", city: "Zurich" },
  { id: "2", name: "Bob", city: "Athens" },
  { id: "3", name: "Cy", city: "Berlin" },
];

const COLUMNS: ColumnDef<Person>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => `Name ${column.getIsSorted() || "unsorted"}`,
    cell: ({ row }) => <NameCell person={row.original} />,
  },
  {
    id: "city",
    accessorKey: "city",
    header: "City",
    cell: ({ row }) => row.original.city,
  },
];

function Grid() {
  const table = useTable({
    features: hubTableFeatures,
    data: PEOPLE,
    columns: COLUMNS,
    getRowId: (person) => person.id,
    enableColumnResizing: true,
    initialState: { pagination: { pageIndex: 0, pageSize: 2 } },
  });
  const actions = {
    "Hide city": () => table.getColumn("city")?.toggleVisibility(false),
    "City first": () => table.setColumnOrder(["city", "name"]),
    "Pin city": () => table.setColumnPinning({ start: ["city"], end: [] }),
    "Sort name descending": () => table.getColumn("name")?.toggleSorting(true),
    "Next page": () => table.nextPage(),
  };
  return (
    <>
      {Object.entries(actions).map(([label, run]) => (
        <button key={label} type="button" onClick={run}>
          {label}
        </button>
      ))}
      <DataTableGrid table={table} hasRows empty={null} />
    </>
  );
}

function bodyRows() {
  const [, body] = screen.getAllByRole("rowgroup");
  return within(body)
    .getAllByRole("row")
    .map((row) =>
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    );
}

function headerNames() {
  return screen
    .getAllByRole("columnheader")
    .map((header) => header.textContent);
}

function cityResizeHandle() {
  const city = screen.getByRole("columnheader", { name: /City/ });
  return within(city).getByRole("button", { name: /Resize column/ });
}

function press(label: string) {
  fireEvent.click(screen.getByRole("button", { name: label }));
}

describe("DataTableGrid table state", () => {
  it("drops a hidden column's header and cells", () => {
    // Arrange
    render(<Grid />);

    // Act
    press("Hide city");

    // Assert
    expect(screen.queryByRole("columnheader", { name: "City" })).toBeNull();
    expect(bodyRows()).toEqual([["Ada"], ["Bob"]]);
  });

  it("shows reordered columns in their new order", () => {
    // Arrange
    render(<Grid />);

    // Act
    press("City first");

    // Assert
    expect(headerNames()).toEqual(["City", "Name unsorted"]);
    expect(bodyRows()).toEqual([
      ["Zurich", "Ada"],
      ["Athens", "Bob"],
    ]);
  });

  it("pins a column's header and body cells to the left edge", () => {
    // Arrange
    render(<Grid />);

    // Act
    press("Pin city");

    // Assert
    expect(
      screen.getByRole("columnheader", { name: /City/ }).classList,
    ).toContain("left-0");
    expect(screen.getByRole("cell", { name: "Zurich" }).classList).toContain(
      "sticky",
    );
    expect(screen.getByRole("cell", { name: "Ada" }).classList).not.toContain(
      "sticky",
    );
  });

  it("applies a resized width to the column's header and cells", () => {
    // Arrange
    render(<Grid />);

    // Act
    fireEvent.keyDown(cityResizeHandle(), { key: "ArrowRight" });

    // Assert: jsdom has no layout, so the new width is the 48 px minimum.
    expect(screen.getByRole("columnheader", { name: /City/ }).style.width).toBe(
      "48px",
    );
    expect(screen.getByRole("cell", { name: "Zurich" }).style.width).toBe(
      "48px",
    );
    expect(screen.getByRole("cell", { name: "Ada" }).style.width).toBe("");
  });

  it("re-renders no cell content when another column is resized", () => {
    // Arrange
    render(<Grid />);
    nameRenders.clear();

    // Act
    fireEvent.keyDown(cityResizeHandle(), { key: "ArrowRight" });

    // Assert
    expect(screen.getByRole("cell", { name: "Zurich" }).style.width).toBe(
      "48px",
    );
    expect(nameRenders.size).toBe(0);
  });

  it("shows the sort in the header and the sorted rows", () => {
    // Arrange
    render(<Grid />);

    // Act
    press("Sort name descending");

    // Assert
    expect(
      screen.getByRole("columnheader", { name: /Name desc/ }),
    ).toBeTruthy();
    expect(bodyRows()).toEqual([
      ["Cy", "Berlin"],
      ["Bob", "Athens"],
    ]);
  });

  it("shows the next page's rows", () => {
    // Arrange
    render(<Grid />);

    // Act
    press("Next page");

    // Assert
    expect(bodyRows()).toEqual([["Cy", "Berlin"]]);
  });
});
