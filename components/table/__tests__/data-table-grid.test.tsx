import { fireEvent, render, screen } from "@testing-library/react";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { createPortal } from "react-dom";
import { describe, expect, it, vi } from "vitest";
import { DataTableGrid } from "../data-table-grid";

type Item = { id: string; name: string };

const COLUMNS: ColumnDef<Item>[] = [
  { id: "name", header: "Name", cell: ({ row }) => row.original.name },
  {
    id: "actions",
    header: "Actions",
    cell: () => (
      <>
        <button type="button">Edit</button>
        {createPortal(<button type="button">Portaled</button>, document.body)}
      </>
    ),
  },
];

function Grid({ onRowClick }: Readonly<{ onRowClick: (id: string) => void }>) {
  const table = useReactTable({
    data: [{ id: "1", name: "Ada" }],
    columns: COLUMNS,
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <DataTableGrid
      table={table}
      hasRows
      empty={null}
      onRowClick={(row) => onRowClick(row.original.id)}
    />
  );
}

function renderGrid() {
  const onRowClick = vi.fn();
  render(<Grid onRowClick={onRowClick} />);
  const row = screen.getByText("Ada").closest("tr")!;
  return { onRowClick, row };
}

describe("DataTableGrid row click", () => {
  it.each(["Enter", " "])("opens a focused row with %j", (key) => {
    // Arrange
    const { onRowClick, row } = renderGrid();

    // Act
    row.focus();
    fireEvent.keyDown(row, { key });

    // Assert
    expect(document.activeElement).toBe(row);
    expect(onRowClick).toHaveBeenCalledWith("1");
  });

  it("ignores keys pressed on a control inside the row", () => {
    // Arrange
    const { onRowClick } = renderGrid();

    // Act
    fireEvent.keyDown(screen.getByRole("button", { name: "Edit" }), {
      key: "Enter",
    });

    // Assert
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("ignores clicks on content portaled out of the row", () => {
    // Arrange
    const { onRowClick } = renderGrid();

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Portaled" }));

    // Assert
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("opens the row on a click inside it", () => {
    // Arrange
    const { onRowClick } = renderGrid();

    // Act
    fireEvent.click(screen.getByText("Ada"));

    // Assert
    expect(onRowClick).toHaveBeenCalledWith("1");
  });
});
