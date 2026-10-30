import { fireEvent, render, screen } from "@testing-library/react";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { DataTableGrid } from "../data-table-grid";

type Row = { id: string; name: string };

const columns: ColumnDef<Row>[] = [
  { id: "actions", enableResizing: false, header: "Actions", cell: () => "" },
  {
    id: "name",
    maxSize: 300,
    header: "Name",
    cell: (c) => c.row.original.name,
  },
];

const ON_SCREEN_WIDTH = 120;

beforeAll(() => {
  // jsdom lays nothing out; give every cell the same on-screen width.
  HTMLElement.prototype.getBoundingClientRect = () =>
    ({ width: ON_SCREEN_WIDTH }) as DOMRect;
  HTMLElement.prototype.setPointerCapture = () => undefined;
});

function Grid({
  resizable = true,
  initial = {},
}: Readonly<{ resizable?: boolean; initial?: ColumnSizingState }>) {
  const [columnSizing, setColumnSizing] = useState(initial);
  const table = useReactTable({
    data: [{ id: "1", name: "Acme" }],
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: resizable,
    state: { columnSizing },
    onColumnSizingChange: setColumnSizing,
  });
  return <DataTableGrid table={table} hasRows empty={null} />;
}

const nameHeader = () => screen.getByRole("columnheader", { name: /name/i });
const handle = () => screen.getByRole("button", { name: /resize column/i });

function pointer(target: Element, type: string, clientX: number) {
  const event = new MouseEvent(type, { bubbles: true, clientX });
  Object.defineProperty(event, "pointerId", { value: 1 });
  fireEvent(target, event);
}

describe("ColumnResizeHandle", () => {
  it("is only offered on tables that opt in, and not on fixed columns", () => {
    // Act
    const { unmount } = render(<Grid resizable={false} />);
    const optedOut = screen.queryAllByRole("button", { name: /resize/i });
    unmount();
    render(<Grid />);

    // Assert
    expect(optedOut).toHaveLength(0);
    expect(screen.getAllByRole("button", { name: /resize/i })).toHaveLength(1);
  });

  it("drags from the width on screen", () => {
    // Arrange
    render(<Grid />);

    // Act
    pointer(handle(), "pointerdown", 100);
    pointer(handle(), "pointermove", 140);
    pointer(handle(), "pointerup", 140);
    pointer(handle(), "pointermove", 400);

    // Assert
    expect(nameHeader().style.width).toBe("160px");
  });

  it("stays within the column's limits", () => {
    // Arrange
    render(<Grid />);

    // Act
    pointer(handle(), "pointerdown", 500);
    pointer(handle(), "pointermove", 0);
    const narrowest = nameHeader().style.width;
    pointer(handle(), "pointermove", 2000);

    // Assert
    expect(narrowest).toBe("48px");
    expect(nameHeader().style.width).toBe("300px");
  });

  it("resizes with the arrow keys and resets on double-click", () => {
    // Arrange
    render(<Grid initial={{ name: ON_SCREEN_WIDTH }} />);

    // Act
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    const wider = nameHeader().style.width;
    fireEvent.keyDown(handle(), { key: "Enter" });
    fireEvent.doubleClick(handle());

    // Assert
    expect(wider).toBe("136px");
    expect(nameHeader().style.width).toBe("");
  });

  it("gives the resized column's cells its width too", () => {
    // Arrange
    render(<Grid initial={{ name: 90 }} />);

    // Act
    const cell = screen.getByRole("cell", { name: "Acme" });

    // Assert
    expect(cell.style.width).toBe("90px");
  });

  it("steps from the width on screen when the stored width is not shown", () => {
    // Arrange
    render(<Grid initial={{ name: 60 }} />);

    // Act
    fireEvent.keyDown(handle(), { key: "ArrowLeft" });

    // Assert
    expect(nameHeader().style.width).toBe("104px");
  });

  it("starts the keyboard from the width on screen", () => {
    // Arrange
    render(<Grid />);

    // Act
    fireEvent.keyDown(handle(), { key: "ArrowLeft" });

    // Assert
    expect(nameHeader().style.width).toBe("104px");
  });
});
