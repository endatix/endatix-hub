import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "@/__tests__/utils/mock-match-media";
import { ColumnOrderProvider } from "@/features/submissions/ui/table/column-order-context";
import { ColumnVisibilityProvider } from "@/features/submissions/ui/table/column-visibility-context";
import { DataTable } from "@/features/submissions/ui/table/data-table";
import type { Submission } from "@/lib/endatix-api/submissions/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

/** Stateful like `CellStatusDropdown`: keeps the value it mounted with. */
function LatchedStatus({ status }: Readonly<{ status: string }>) {
  const [seen] = useState(status);
  return <span>{seen}</span>;
}

const columns: ColumnDef<Submission>[] = [
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <LatchedStatus status={row.original.status} />,
  },
];

function submission(id: string, status: string): Submission {
  return {
    id,
    status,
    formId: "form-1",
    formDefinitionId: "definition-1",
    isComplete: true,
    isTestSubmission: false,
    jsonData: "{}",
    currentPage: 1,
    metadata: "{}",
    token: id,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    completedAt: new Date("2026-01-01T00:02:00Z"),
  } as Submission;
}

function renderPage(items: Submission[], page: number, isPending = false) {
  return (
    <ColumnOrderProvider formId="form-1" defaultColumns={columns}>
      <ColumnVisibilityProvider formId="form-1" defaultColumns={columns}>
        <DataTable
          data={items}
          columns={columns}
          pagination={{ pageIndex: page - 1, pageSize: 1 }}
          onPaginationChange={vi.fn()}
          rowCount={2}
          pageCount={2}
          isPending={isPending}
        />
      </ColumnVisibilityProvider>
    </ColumnOrderProvider>
  );
}

describe("DataTable paging", () => {
  beforeEach(() => {
    localStorage.clear();
    mockMatchMedia(false);
  });

  it("renders the next page's rows when the server page changes in place", () => {
    const view = render(renderPage([submission("sub-1", "new")], 1));
    expect(screen.getByText("new")).toBeTruthy();

    view.rerender(renderPage([submission("sub-2", "approved")], 2));

    expect(screen.getByText("approved")).toBeTruthy();
    expect(screen.queryByText("new")).toBeNull();
  });

  it("keeps the header and shows skeleton rows while the next page is pending", () => {
    const view = render(renderPage([submission("sub-1", "new")], 1));

    view.rerender(renderPage([submission("sub-1", "new")], 1, true));

    expect(screen.getByText("Status")).toBeTruthy();
    expect(screen.queryByText("new")).toBeNull();
    expect(
      view.container.querySelectorAll("[data-slot=data-table-skeleton-row]"),
    ).toHaveLength(1);
  });
});
