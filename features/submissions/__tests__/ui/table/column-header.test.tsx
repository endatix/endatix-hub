import {
  ColumnHeader,
  DateFilterControls,
} from "@/features/submissions/ui/table/column-header";
import { ColumnVisibilityProvider } from "@/features/submissions/ui/table/column-visibility-context";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

describe("ColumnHeader", () => {
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

  it("uses a column menu button separate from the sort surface", () => {
    renderColumnHeader();

    expect(
      screen.getByRole("button", { name: /created at column menu/i }),
    ).toBeDefined();
  });
});
