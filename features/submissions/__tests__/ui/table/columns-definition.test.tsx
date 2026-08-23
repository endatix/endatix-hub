import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/submissions/ui/table/row-actions", () => ({
  RowActions: () => null,
}));

vi.mock("@/features/submissions/ui/table/cell-status-dropdown", () => ({
  CellStatusDropdown: () => null,
}));

/** Avoid loading `change-status.action` (Next / auth) via table status UI. */
vi.mock(
  "@/features/submissions/use-cases/change-status/change-status.action",
  () => ({
    changeStatusAction: vi.fn(),
  }),
);

import {
  buildSubmissionDataColumns,
  buildSubmissionSystemColumns,
  humanizeFieldName,
} from "@/features/submissions/ui/table/columns-definition";

describe("submission table column definitions", () => {
  it.each([
    ["firstName", "First Name"],
    ["contact_email", "Contact Email"],
    ["company-name", "Company Name"],
  ])("humanizes %s as %s", (fieldName, expected) => {
    expect(humanizeFieldName(fieldName)).toBe(expected);
  });

  it("labels the submitter display id column with NEXT_PUBLIC_SUBMITTER_PRIMARY_FILTER_LABEL", () => {
    const columns = buildSubmissionSystemColumns();
    const displayIdColumn = columns.find(
      (col) => col.id === "submitterDisplayId",
    );

    expect(displayIdColumn?.meta?.displayName).toBe("Submitter");
  });

  it("includes Started as a default system column with date filter support", () => {
    const onDateFilterChange = vi.fn();
    const columns = buildSubmissionSystemColumns({
      dateFilters: {
        createdAt: {},
        modifiedAt: {},
        startedAt: {},
        completedAt: {},
      },
      onDateFilterChange,
    });
    const startedAtColumn = columns.find((col) => col.id === "startedAt");

    expect(startedAtColumn?.meta?.displayName).toBe("Started");
    expect(startedAtColumn?.meta?.defaultHidden).not.toBe(true);
    expect(startedAtColumn).toEqual(
      expect.objectContaining({
        id: "startedAt",
        accessorKey: "startedAt",
      }),
    );
  });

  it("includes Last modified with date filter support", () => {
    const onDateFilterChange = vi.fn();
    const columns = buildSubmissionSystemColumns({
      dateFilters: {
        createdAt: {},
        modifiedAt: {},
        startedAt: {},
        completedAt: {},
      },
      onDateFilterChange,
    });
    const modifiedAtColumn = columns.find((col) => col.id === "modifiedAt");

    expect(modifiedAtColumn?.meta?.displayName).toBe("Last modified");
    expect(modifiedAtColumn).toEqual(
      expect.objectContaining({
        id: "modifiedAt",
        accessorKey: "modifiedAt",
      }),
    );
  });

  it("orders system columns for review-first UX", () => {
    const columns = buildSubmissionSystemColumns();
    const systemIds = columns.map((col) => col.id);

    expect(systemIds.slice(0, 6)).toEqual([
      "actions",
      "complete",
      "modifiedAt",
      "startedAt",
      "completedAt",
      "createdAt",
    ]);
    expect(systemIds.at(-1)).toBe("status");
  });

  it("uses shortened system column headers for density", () => {
    const columns = buildSubmissionSystemColumns();

    expect(
      columns.find((col) => col.id === "createdAt")?.meta?.displayName,
    ).toBe("Created");
    expect(
      columns.find((col) => col.id === "complete")?.meta?.displayName,
    ).toBe("Complete");
    expect(
      columns.find((col) => col.id === "completedAt")?.meta?.displayName,
    ).toBe("Completed");
    expect(
      columns.find((col) => col.id === "completionTime")?.meta?.displayName,
    ).toBe("Time");
  });

  it("keeps action columns compact and gives text columns a min width", () => {
    const columns = buildSubmissionSystemColumns();

    expect(
      columns.find((col) => col.id === "actions")?.meta?.headerClassName,
    ).toContain("w-12");
    expect(
      columns.find((col) => col.id === "complete")?.meta?.headerClassName,
    ).toContain("w-12");
    expect(
      columns.find((col) => col.id === "createdAt")?.meta?.cellClassName,
    ).toContain("min-w-");
    expect(
      columns.find((col) => col.id === "status")?.meta?.headerClassName,
    ).toContain("min-w-");
  });
  it("uses humanized field names for dynamic form column labels and hides them by default", () => {
    const columns = buildSubmissionDataColumns([
      {
        name: "firstName",
        title: "What is your first name? {someExpression}",
        type: "text",
      },
    ]);

    expect(columns[0].id).toBe("data_firstName");
    expect(columns[0].header).toBe("First Name");
    expect(columns[0].enableSorting).toBe(false);
    expect(columns[0].meta?.displayName).toBe("First Name");
    expect(columns[0].meta?.defaultHidden).toBe(true);
  });
});
