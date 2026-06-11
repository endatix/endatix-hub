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
    const displayIdColumn = columns.find((col) => col.id === "submitterDisplayId");

    expect(displayIdColumn?.meta?.displayName).toBe("Panelist ID");
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
