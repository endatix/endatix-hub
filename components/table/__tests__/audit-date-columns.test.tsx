import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { auditDateColumns, type AuditDates } from "../audit-date-columns";
import { DataTableGrid } from "../data-table-grid";

interface Row extends AuditDates {
  id: string;
}

const ROWS: Row[] = [
  {
    id: "1",
    createdAt: "2026-01-15T00:00:00.000Z",
    modifiedAt: "2026-02-20T00:00:00.000Z",
  },
];

function Grid({ updateUrl }: Readonly<{ updateUrl: UrlSearchParamsUpdater }>) {
  const columns = auditDateColumns<Row>({
    created: { from: "2026-01-01" },
    modified: {},
    updateUrl,
  }) as ColumnDef<Row>[];
  const table = useReactTable({
    data: ROWS,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualSorting: true,
  });

  return <DataTableGrid table={table} hasRows empty={null} />;
}

describe("auditDateColumns", () => {
  it("renders a Created and a Modified column with their row values", () => {
    render(<Grid updateUrl={vi.fn()} />);

    expect(screen.getByText("Created")).toBeTruthy();
    expect(screen.getByText("Modified")).toBeTruthy();
    expect(screen.getByText(/Jan 15/)).toBeTruthy();
    expect(screen.getByText(/Feb 20/)).toBeTruthy();
  });

  it("keeps each column's sort id aligned with the list sortBy values", () => {
    const columns = auditDateColumns<Row>({
      created: {},
      modified: {},
      updateUrl: vi.fn(),
    });

    expect(columns.map((column) => column.id)).toEqual([
      "createdAt",
      "modifiedAt",
    ]);
    expect(columns.every((column) => column.enableSorting)).toBe(true);
  });
});
