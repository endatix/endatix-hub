import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTableToolbar } from "../data-table-toolbar";

describe("DataTableToolbar", () => {
  it("keeps filters and actions in a single toolbar row", () => {
    render(
      <DataTableToolbar
        filters={<button type="button">Status</button>}
        actions={<button type="button">View</button>}
      />,
    );

    expect(
      screen
        .getByRole("button", { name: "Status" })
        .closest('[data-slot="data-table-toolbar-filters"]'),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "View" })
        .closest('[data-slot="data-table-toolbar-actions"]'),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Status" })
        .closest('[data-slot="data-table-toolbar"]'),
    ).toBe(
      screen
        .getByRole("button", { name: "View" })
        .closest('[data-slot="data-table-toolbar"]'),
    );
  });
});
