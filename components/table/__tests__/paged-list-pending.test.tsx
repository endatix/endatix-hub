import { render, screen } from "@testing-library/react";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { describe, expect, it, vi } from "vitest";
import { DataTableGrid } from "../data-table-grid";
import { PagedListFrame } from "../paged-list-frame";
import { PagedListUrlProvider } from "../paged-list-url-provider";

const navigation = vi.hoisted(() => ({ isPending: false }));

vi.mock("@/components/table/use-list-url-state", () => ({
  useListUrlState: () => ({
    search: "",
    setSearch: vi.fn(),
    urlSearch: "",
    updateUrl: vi.fn(),
    searchParams: new URLSearchParams(),
    isPending: navigation.isPending,
  }),
}));

type Row = { id: string; name: string };

const columns: ColumnDef<Row>[] = [
  {
    id: "name",
    header: () => <button>Name filter</button>,
    cell: (c) => c.row.original.name,
  },
];

const twoRows: Row[] = [
  { id: "1", name: "Acme" },
  { id: "2", name: "Beta" },
];

function Grid({
  isPending,
  data = twoRows,
}: Readonly<{ isPending: boolean; data?: Row[] }>) {
  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <DataTableGrid
      table={table}
      hasRows={data.length > 0}
      isPending={isPending}
      empty={<p>Nothing here</p>}
    />
  );
}

describe("pending rows", () => {
  it("DataTableGrid keeps the header and swaps rows for as many skeleton rows", () => {
    const { container } = render(<Grid isPending />);

    expect(screen.getByRole("button", { name: "Name filter" })).toBeTruthy();
    expect(screen.queryByText("Acme")).toBeNull();
    expect(
      container.querySelectorAll("[data-slot=data-table-skeleton-row]"),
    ).toHaveLength(2);
  });

  it("DataTableGrid shows skeleton rows, not the empty state, while an empty list reloads", () => {
    const { container } = render(<Grid isPending data={[]} />);

    expect(screen.queryByText("Nothing here")).toBeNull();
    expect(
      container.querySelectorAll("[data-slot=data-table-skeleton-row]"),
    ).toHaveLength(5);
  });

  it("DataTableGrid shows the rows when nothing is pending", () => {
    render(<Grid isPending={false} />);

    expect(screen.getByText("Acme")).toBeTruthy();
  });

  it("PagedListFrame shows the skeleton while its isPending prop is set", () => {
    render(
      <PagedListFrame listKey="k" isPending fallback={<p>Skeleton</p>}>
        <p>Rows</p>
      </PagedListFrame>,
    );

    expect(screen.getByText("Skeleton")).toBeTruthy();
    expect(screen.queryByText("Rows")).toBeNull();
  });

  it("PagedListFrame follows PagedListUrlProvider's pending state", () => {
    navigation.isPending = true;
    render(
      <PagedListUrlProvider>
        <PagedListFrame listKey="k" fallback={<p>Skeleton</p>}>
          <p>Rows</p>
        </PagedListFrame>
      </PagedListUrlProvider>,
    );

    expect(screen.getByText("Skeleton")).toBeTruthy();
    navigation.isPending = false;
  });
});
