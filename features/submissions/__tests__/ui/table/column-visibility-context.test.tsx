import {
  ColumnVisibilityProvider,
  useColumnVisibility,
} from "@/features/submissions/ui/table/column-visibility-context";
import { ColumnDef } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

function VisibilityProbe() {
  const { columnVisibility } = useColumnVisibility();

  return (
    <>
      <div>createdAt: {String(columnVisibility.createdAt)}</div>
      <div>data_firstName: {String(columnVisibility.data_firstName)}</div>
    </>
  );
}

describe("ColumnVisibilityProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses column metadata defaults for initial visibility", () => {
    const columns: ColumnDef<any>[] = [
      {
        id: "createdAt",
      },
      {
        id: "data_firstName",
        meta: {
          defaultHidden: true,
        },
      },
    ];

    render(
      <ColumnVisibilityProvider formId="form-1" defaultColumns={columns}>
        <VisibilityProbe />
      </ColumnVisibilityProvider>,
    );

    expect(screen.getByText("createdAt: true").textContent).toBe(
      "createdAt: true",
    );
    expect(screen.getByText("data_firstName: false").textContent).toBe(
      "data_firstName: false",
    );
  });
});
