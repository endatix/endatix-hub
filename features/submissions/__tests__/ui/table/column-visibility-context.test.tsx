import { mockMatchMedia } from "@/__tests__/utils/mock-match-media";
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
      <div>startedAt: {String(columnVisibility.startedAt)}</div>
    </>
  );
}

describe("ColumnVisibilityProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    mockMatchMedia(false);
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

  it("soft-hides Created (not Started) on narrow viewports when prefs are unset", () => {
    mockMatchMedia(true);
    const columns: ColumnDef<any>[] = [
      { id: "createdAt" },
      { id: "startedAt" },
      { id: "completedAt" },
      { id: "completionTime" },
    ];

    render(
      <ColumnVisibilityProvider formId="form-narrow" defaultColumns={columns}>
        <VisibilityProbe />
      </ColumnVisibilityProvider>,
    );

    expect(screen.getByText("createdAt: false").textContent).toBe(
      "createdAt: false",
    );
    expect(screen.getByText("startedAt: true").textContent).toBe(
      "startedAt: true",
    );
  });
});
