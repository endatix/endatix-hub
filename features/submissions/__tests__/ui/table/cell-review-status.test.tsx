import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CellReviewStatus } from "../../../ui/table/cell-review-status";

vi.mock("@/features/submissions/ui/table/cell-status-dropdown", () => ({
  CellStatusDropdown: ({ code }: { code: string }) => (
    <span>review:{code}</span>
  ),
}));

describe("CellReviewStatus", () => {
  it("shows the review control once the submission is complete", () => {
    // Arrange & Act
    render(
      <CellReviewStatus
        submission={{
          id: "1",
          formId: "2",
          status: "new",
          isComplete: true,
          collectionStatus: "complete",
        }}
      />,
    );

    // Assert
    expect(screen.getByText("review:new")).toBeDefined();
  });

  it("shows a dash while the submission is still being collected", () => {
    // Arrange & Act
    render(
      <CellReviewStatus
        submission={{
          id: "1",
          formId: "2",
          status: "new",
          isComplete: false,
          collectionStatus: "in_progress",
        }}
      />,
    );

    // Assert
    expect(screen.getByText("Not reviewable until complete")).toBeDefined();
    expect(screen.queryByText(/review:/)).toBeNull();
  });
});
