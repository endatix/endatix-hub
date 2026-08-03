import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubmissionsTableSkeleton } from "@/features/submissions/ui/table/submissions-table-skeleton";

describe("SubmissionsTableSkeleton", () => {
  it("renders a table skeleton with the requested row count", () => {
    render(<SubmissionsTableSkeleton pageSize={3} />);

    const status = screen.getByTestId("submissions-table-skeleton");
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Loading submissions…")).not.toBeNull();
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(
      screen
        .getByTestId("submissions-table-skeleton")
        .querySelectorAll('[class*="bg-surface-container-low"]').length,
    ).toBeGreaterThan(0);
  });
});
