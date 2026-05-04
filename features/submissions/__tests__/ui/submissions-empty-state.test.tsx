import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  NoMatchingSubmissionsEmptyState,
  NoSubmissionsEmptyState,
} from "../../ui/submissions-empty-state";

describe("Submissions empty states", () => {
  it("renders true empty copy with share action", () => {
    // Arrange
    const onShareForm = vi.fn();

    // Act
    render(<NoSubmissionsEmptyState onShareForm={onShareForm} />);
    fireEvent.click(screen.getByRole("button", { name: /share form/i }));

    // Assert
    screen.getByText("No submissions yet");
    screen.getByText(
      "Responses will appear here as soon as someone submits this form.",
    );
    expect(onShareForm).toHaveBeenCalledOnce();
  });

  it("renders filtered empty copy with reset filters action", () => {
    // Arrange
    const onClearFilters = vi.fn();

    // Act
    render(<NoMatchingSubmissionsEmptyState onClearFilters={onClearFilters} />);
    fireEvent.click(screen.getByRole("button", { name: /reset filters/i }));

    // Assert
    screen.getByText("No submissions match current filters.");
    expect(onClearFilters).toHaveBeenCalledOnce();
  });
});
