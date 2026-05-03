import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SubmissionsFilterToolbar } from "../../../ui/filters/submissions-filter-toolbar";

describe("SubmissionsFilterToolbar", () => {
  it("renders submission type filter", () => {
    // Arrange
    const onChange = vi.fn();

    // Act
    render(
      <SubmissionsFilterToolbar
        isCompleteFilter={new Set()}
        statusFilter={new Set()}
        testSubmissionFilter={new Set()}
        onIsCompleteChange={onChange}
        onStatusChange={onChange}
        onTestSubmissionChange={onChange}
        onResetFilters={onChange}
      />,
    );

    // Assert
    expect(screen.getByText("Submission Type")).toBeDefined();
  });

  it("shows reset button when test filter is active", () => {
    // Arrange
    const onChange = vi.fn();

    // Act
    render(
      <SubmissionsFilterToolbar
        isCompleteFilter={new Set()}
        statusFilter={new Set()}
        testSubmissionFilter={new Set(["true"])}
        onIsCompleteChange={onChange}
        onStatusChange={onChange}
        onTestSubmissionChange={onChange}
        onResetFilters={onChange}
      />,
    );

    // Assert
    expect(screen.getByRole("button", { name: /reset filters/i })).toBeDefined();
  });
});
